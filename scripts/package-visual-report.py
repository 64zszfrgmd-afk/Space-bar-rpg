"""Package the real browser evidence downloaded from the successful build job."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib,json
root=Path(__file__).resolve().parent.parent
folder=root/'test-results/world-visual'
report=json.loads((folder/'results.json').read_text())
assert {r['engine'] for r in report['reports']}=={'chromium','webkit'}
for r in report['reports']:
    assert len(r['rooms'])==9 and len(r['npcs'])==23 and len(r['heroes'])==5
    assert not r['errors'] and r['loadFailureRollback']
    for n in r['npcs']: assert n['arrivalPixels']>=8 and n['modelPixels']>100 and n['dialogue']
version=json.loads((root/'package.json').read_text())['version']
archive=root/f'artifacts/spacebar-rpg-{version}-visual-report.zip'
archive.parent.mkdir(exist_ok=True)
with ZipFile(archive,'w',ZIP_DEFLATED) as z:
    for p in sorted(folder.rglob('*')):
        if p.is_file():z.write(p,'world-visual/'+p.relative_to(folder).as_posix())
    for p in sorted((root/'docs/visual-v021').glob('*')):
        if p.is_file():z.write(p,'baseline-0.20/'+p.name)
    z.write(root/'docs/WORLD-FIXES-021.md','WORLD-FIXES-021.md')
with ZipFile(archive) as z:assert z.testzip() is None
sha=hashlib.sha256(archive.read_bytes()).hexdigest();archive.with_suffix('.zip.sha256').write_text(f'{sha}  {archive.name}\n')
print(f'{archive}\nSHA256 {sha}')
