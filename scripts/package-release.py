"""Build a source + dist ZIP from an already committed, clean checkout."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import json
import subprocess

root = Path(__file__).resolve().parent.parent
if subprocess.check_output(['git', 'status', '--porcelain'], cwd=root).strip():
    raise SystemExit('Commit changes before packaging; release must identify a clean source commit.')
version = json.loads((root / 'package.json').read_text())['version']
commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
tracked = subprocess.check_output(['git', 'ls-files', '-z'], cwd=root).decode().split('\0')
files = sorted([root / name for name in tracked if name] + [p for p in (root / 'dist').rglob('*') if p.is_file()])
if not (root / 'dist/index.html').is_file():
    raise SystemExit('Run npm run build before packaging.')
metadata = json.loads((root / 'public/version.json').read_text()) if (root / 'public/version.json').exists() else {}
if metadata.get('version') != version or json.loads((root / 'dist/version.json').read_text()) != metadata:
    raise SystemExit('Build/version identity is stale; run npm run build.')
manifest = {'revision': metadata.get('revision','restore-1'), 'version': version, 'baseVersion': '0.21.0', 'sourceCommit': commit,
            'files': {p.relative_to(root).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in files}}
out = root / 'artifacts'
out.mkdir(exist_ok=True)
archive = out / f'spacebar-rpg-{version}.zip'
prefix = f'Space-bar-rpg-{version}/'
with ZipFile(archive, 'w', ZIP_DEFLATED) as z:
    for p in files:
        z.write(p, prefix + p.relative_to(root).as_posix())
    z.writestr(prefix + 'RELEASE-MANIFEST.json', json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
with ZipFile(archive) as z:
    assert z.testzip() is None
    assert json.loads(z.read(prefix + 'package.json'))['version'] == version
    assert prefix + 'dist/index.html' in z.namelist()
checksum = hashlib.sha256(archive.read_bytes()).hexdigest()
(archive.with_suffix('.zip.sha256')).write_text(f'{checksum}  {archive.name}\n')
print(f'{archive}\n{archive.stat().st_size} bytes\nSHA256 {checksum}\nSource {commit}')
