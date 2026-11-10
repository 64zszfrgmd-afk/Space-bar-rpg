"""Keep the complete deployed 0.21.0 artifact and add an isolated 0.21.1 path."""
from pathlib import Path
import argparse, hashlib, io, json, os, shutil, subprocess, tarfile, time, urllib.request

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = json.loads((ROOT / 'hosting/production-0.21.0.json').read_text())
PREVIEW_PATH = 'test/0.21.1/'
PREFIX = 'spacebar-test-0211:'

def digest(data):
    return hashlib.sha256(data).hexdigest()

def read_url(url):
    with urllib.request.urlopen(url, timeout=25) as response:
        assert response.status == 200, url
        return response.read()

def check_production():
    for name, expected in MANIFEST['files'].items():
        assert digest(read_url(MANIFEST['url'] + name)) == expected, 'Published production changed: ' + name
    print('Production unchanged: all six deployed file hashes match 0.21.0')

def guard_main():
    headers = {'Accept': 'application/vnd.github+json'}
    token = os.environ.get('GH_TOKEN')
    if token:
        headers['Authorization'] = 'Bearer ' + token
    request = urllib.request.Request(
        'https://api.github.com/repos/64zszfrgmd-afk/Space-bar-rpg/git/ref/heads/main',
        headers=headers)
    with urllib.request.urlopen(request, timeout=25) as response:
        assert json.load(response)['object']['sha'] == MANIFEST['mainCommit'], 'main changed; preserve its new deployed artifact first'
    check_production()

def assemble():
    archive = (ROOT / 'hosting/production-0.21.0.tar.gz').read_bytes()
    assert digest(archive) == MANIFEST['archiveSha256']
    site = ROOT / 'pages-preview'
    assert not site.exists(), 'Use a fresh staging directory; existing files are never removed'
    site.mkdir()
    with tarfile.open(fileobj=io.BytesIO(archive), mode='r:gz') as tar:
        extracted = set()
        for member in tar.getmembers():
            name = member.name.removeprefix('./')
            if member.isdir():
                continue
            assert member.isfile() and name and not name.startswith('/') and '..' not in Path(name).parts
            data = tar.extractfile(member).read()
            assert name in MANIFEST['files'] and digest(data) == MANIFEST['files'][name], name
            target = site / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            extracted.add(name)
        assert extracted == set(MANIFEST['files'])
    preview = ROOT / 'preview-dist'
    assert json.loads((preview / 'version.json').read_text())['version'] == '0.21.1'
    target = site / PREVIEW_PATH
    shutil.copytree(preview, target)
    commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    metadata = dict(version='0.21.1', sourceCommit=commit,
                    sourceBranch='feature/v0.21-world-fixes',
                    base='/Space-bar-rpg/' + PREVIEW_PATH,
                    savePrefix=PREFIX, productionCommit=MANIFEST['mainCommit'])
    (target / 'preview-build.json').write_text(json.dumps(metadata, indent=2) + '\n')
    for name, expected in MANIFEST['files'].items():
        assert digest((site / name).read_bytes()) == expected, name
    print('Staged original production plus ' + PREVIEW_PATH + ' at ' + commit)

def verify_published():
    check_production()
    site = ROOT / 'pages-preview'
    expected = {p.relative_to(site).as_posix(): digest(p.read_bytes())
                for p in site.rglob('*') if p.is_file()}
    # Pages/CDN may take a few seconds after the deployment reports success.
    for attempt in range(12):
        try:
            for name, sha in expected.items():
                assert digest(read_url(MANIFEST['url'] + name)) == sha, name
            break
        except Exception:
            if attempt == 11:
                raise
            time.sleep(5)
    folder = ROOT / 'test-results/pages-preview'
    folder.mkdir(parents=True, exist_ok=True)
    (folder / 'published-files.json').write_text(json.dumps(expected, indent=2) + '\n')
    print('HTTPS publication verified: ' + str(len(expected)) + ' exact files')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['check-production', 'guard-main', 'assemble', 'verify-published'])
    action = parser.parse_args().action
    {'check-production': check_production, 'guard-main': guard_main, 'assemble': assemble,
     'verify-published': verify_published}[action]()
