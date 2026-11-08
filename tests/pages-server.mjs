import {createServer} from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

export const pagesBase = '/Space-bar-rpg/';
export const dist = fileURLToPath(new URL('../dist/', import.meta.url));

// Strict static hosting: no Vite history fallback masking a missing JS/CSS asset.
export async function servePages() {
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (pathname === pagesBase.slice(0, -1)) {
        response.writeHead(308, {location: pagesBase});response.end();return;
      }
      if (!pathname.startsWith(pagesBase)) {response.writeHead(404);response.end();return}
      const file = resolve(dist, pathname.slice(pagesBase.length) || 'index.html');
      if (!file.startsWith(resolve(dist) + sep)) {response.writeHead(403);response.end();return}
      if (!(await stat(file)).isFile()) {response.writeHead(404);response.end();return}
      const mime = file.endsWith('.js') ? 'application/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.html') ? 'text/html' : file.endsWith('.json') ? 'application/json' : 'application/octet-stream';
      response.writeHead(200, {'content-type': mime + '; charset=utf-8', 'cache-control': 'no-store'});
      response.end(await readFile(file));
    } catch {response.writeHead(404);response.end()}
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {server, origin: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))};
}

export function assetPaths(html) {
  return [...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g)].map(match => match[1]).filter(url => !url.startsWith('data:'));
}
