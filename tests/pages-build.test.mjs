import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, stat} from 'node:fs/promises';
import {join} from 'node:path';
import {assetPaths, dist, pagesBase, servePages} from './pages-server.mjs';

test('production JS and CSS use the exact GitHub Pages project path', async () => {
  const html = await readFile(join(dist, 'index.html'), 'utf8');
  const assets = assetPaths(html);
  assert.ok(assets.some(url => url.endsWith('.js')));
  assert.ok(assets.some(url => url.endsWith('.css')));
  for (const url of assets) {
    assert.ok(url.startsWith(pagesBase + 'assets/'), url);
    assert.ok((await stat(join(dist, url.slice(pagesBase.length)))).isFile());
  }
  assert.equal(html.includes('/src/main.ts'), false);
  assert.ok(html.includes('startup-message'));
});

test('subpath hosting returns scripts/styles as assets, never HTML fallbacks', async () => {
  const host = await servePages();
  try {
    const entry = await fetch(host.origin + pagesBase);
    assert.equal(entry.status, 200);
    for (const path of assetPaths(await entry.text())) {
      const response = await fetch(host.origin + path);
      assert.equal(response.status, 200, path);
      assert.match(response.headers.get('content-type'), path.endsWith('.js') ? /javascript/ : /text\/css/);
      assert.equal((await response.text()).trimStart().startsWith('<!doctype'), false);
    }
    assert.equal((await fetch(host.origin + '/assets/missing.js')).status, 404);
    assert.equal((await fetch(host.origin + pagesBase + 'assets/missing.js')).status, 404);
  } finally {await host.close()}
});

test('the repository URL redirects to its canonical trailing slash', async () => {
  const host = await servePages();
  try {
    const response = await fetch(host.origin + pagesBase.slice(0, -1), {redirect: 'manual'});
    assert.equal(response.status, 308);
    assert.equal(response.headers.get('location'), pagesBase);
  } finally {await host.close()}
});

test('build identity is available as JSON at the Pages project path', async () => {
  const metadata = JSON.parse(await readFile(join(dist, 'version.json'), 'utf8'));
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(metadata.version, pkg.version);
  assert.equal(metadata.revision, 'history-2');
  const host = await servePages();
  try {
    const response = await fetch(host.origin + pagesBase + 'version.json');
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /application\/json/);
    assert.deepEqual(await response.json(), metadata);
  } finally {await host.close()}
});
