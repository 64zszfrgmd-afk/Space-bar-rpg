import {readFile, mkdir, writeFile, mkdtemp, rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {assetPaths, dist, pagesBase} from '../tests/pages-server.mjs';
import {join, resolve, sep} from 'node:path';
import {tmpdir} from 'node:os';

const target = new URL(process.env.SPACEBAR_TEST_URL || 'https://64zszfrgmd-afk.github.io/Space-bar-rpg/');
if (target.protocol !== 'https:' || target.pathname !== pagesBase || target.search || target.hash) throw Error('Expected the HTTPS GitHub project Pages URL');
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
const worktreeDirty = Boolean(execFileSync('git', ['status', '--porcelain'], {encoding: 'utf8'}).trim());
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
async function fetchBytes(url) {
  const temporary = await mkdtemp(join(tmpdir(), 'spacebar-audit-'));
  try {
    // curl honours the environment's proxy and CA settings. No shell expansion.
    const result = execFileSync('curl', ['--fail', '--silent', '--show-error', '--location', '--proto', '=https', '--proto-redir', '=https', '--max-time', '20', '--header', 'Cache-Control: no-cache', '--output', join(temporary, 'body'), '--write-out', '%{http_code}\n%{content_type}', url.href], {encoding: 'utf8'});
    const [status, mime] = result.split('\n');
    return {bytes: await readFile(join(temporary, 'body')), status: Number(status), mime};
  } finally {await rm(temporary, {recursive: true, force: true})}
}
const html = await fetchBytes(target);
const localHtml = await readFile(join(dist, 'index.html'));
const assets = [];
for (const path of assetPaths(html.bytes.toString('utf8'))) {
  if (!path.startsWith(pagesBase + 'assets/')) throw Error(`Unexpected asset URL: ${path}`);
  const remote = await fetchBytes(new URL(path, target));
  const localPath = resolve(dist, path.slice(pagesBase.length));
  if (!localPath.startsWith(resolve(dist) + sep)) throw Error(`Asset escapes dist: ${path}`);
  const local = await readFile(localPath);
  assets.push({path, status: remote.status, mime: remote.mime, sha256: digest(remote.bytes), matchesLocalBuild: remote.bytes.equals(local)});
}
const report = {checkedAt: new Date().toISOString(), url: target.href, sourceCommit, worktreeDirty, sourcePackageVersion: pkg.version, htmlMatchesLocalBuild: html.bytes.equals(localHtml), assets};
await mkdir(new URL('../test-results/', import.meta.url), {recursive: true});
await writeFile(new URL('../test-results/published-version-audit.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.htmlMatchesLocalBuild || !assets.every(asset => asset.matchesLocalBuild)) {
  throw Error('Published bytes differ from this checkout; do not infer its version from this package.json');
}
console.log(`Published HTML, JS and CSS match this checkout (package ${pkg.version}).`);
