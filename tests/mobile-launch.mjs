import {chromium, webkit} from 'playwright';
import {existsSync} from 'node:fs';
import {mkdir, writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {pagesBase, servePages} from './pages-server.mjs';

const results = new URL('../test-results/', import.meta.url);
await mkdir(results, {recursive: true});
const host = await servePages();
const reports = [];
const requested = (process.env.SPACEBAR_BROWSERS || 'chromium,webkit').split(',');
if (!requested.length || requested.some(name => !['chromium', 'webkit'].includes(name))) throw new Error('SPACEBAR_BROWSERS must contain chromium and/or webkit');
try {
  for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
    if (!requested.includes(name)) continue;
    const executablePath = name === 'chromium' ? (process.env.SPACEBAR_CHROMIUM || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined)) : undefined;
    const browser = await engine.launch({headless: true, ...(executablePath ? {executablePath} : {}), ...(name === 'chromium' ? {args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']} : {})});
    try {
      const context = await browser.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true, deviceScaleFactor: 2});
      const page = await context.newPage(), errors = [], badResponses = [], external = [], assets = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => {
        if (response.status() >= 400) badResponses.push({url: response.url(), status: response.status()});
        if (response.url().includes('/assets/')) assets.push({url: response.url(), type: response.headers()['content-type']});
      });
      await page.route('**/*', route => {
        if (!route.request().url().startsWith(host.origin + '/')) {external.push(route.request().url());return route.abort()}
        return route.continue();
      });
      await page.goto(host.origin + pagesBase);
      await page.locator('#startup[hidden]').waitFor({state: 'attached', timeout: 30000});
      assert.equal(await page.locator('#scene canvas').count(), 1);
      assert.match(await page.locator('#credits').innerText(), /120/);
      assert.ok(await page.locator('#joystick').isVisible());
      const canvas = await page.locator('canvas').evaluate(canvas => ({width: canvas.width, height: canvas.height}));
      assert.ok(canvas.width > 0 && canvas.width <= 390 * 1.25 + 1);
      assert.ok(canvas.height > 0 && canvas.height <= 844 * 1.25 + 1);
      await page.locator('#camera').tap();assert.match(await page.locator('#camera').innerText(), /третьего лица/);
      await page.locator('#camera').tap();assert.match(await page.locator('#camera').innerText(), /первого лица/);
      await page.locator('#joystick').tap();
      await page.locator('#dance').tap();assert.match(await page.locator('#toast').innerText(), /Танцпол/);
      assert.deepEqual(await page.evaluate(() => [scrollX, scrollY, document.documentElement.scrollWidth <= innerWidth]), [0, 0, true]);
      await page.screenshot({path: new URL(`${name}-portrait.png`, results).pathname});
      await page.setViewportSize({width: 844, height: 390});
      await page.waitForTimeout(150);
      for (const id of ['camera', 'dance', 'sound', 'joystick', 'menu', 'run']) {
        const box = await page.locator('#' + id).boundingBox();
        assert.ok(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= 845 && box.y + box.height <= 391, id);
      }
      assert.deepEqual(await page.evaluate(() => [scrollX, scrollY, document.documentElement.scrollWidth <= innerWidth]), [0, 0, true]);
      const rects=await page.evaluate(()=>['camera','dance','sound','menu','joystick','run'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {id,x:r.x,y:r.y,w:r.width,h:r.height}}));
      for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){const a=rects[i],b=rects[j];assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y, a.id+' overlaps '+b.id)}
      await page.screenshot({path: new URL(`${name}-landscape.png`, results).pathname});
      for(const [width,height] of [[320,568],[568,320],[360,800]]){
        await page.setViewportSize({width,height});
        const layout=await page.evaluate(()=>{
          const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}};
          return {stats:rect('.stats'),quest:rect('#quest'),buttons:['camera','dance','sound','menu','run','joystick'].map(id=>({id,...rect('#'+id)})),scroll:[scrollX,scrollY,document.documentElement.scrollWidth<=innerWidth]};
        });
        assert.ok(layout.stats.y+layout.stats.h<=layout.quest.y,'quest below stats at '+width);
        for(const b of layout.buttons)assert.ok(b.x>=0&&b.y>=0&&b.x+b.w<=width+1&&b.y+b.h<=height+1,b.id+' fits '+width);
        for(let i=0;i<layout.buttons.length;i++)for(let j=i+1;j<layout.buttons.length;j++){const a=layout.buttons[i],b=layout.buttons[j];assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,a.id+' overlaps '+b.id+' at '+width)}
        assert.deepEqual(layout.scroll,[0,0,true]);
        await page.screenshot({path:new URL(`${name}-${width}x${height}.png`,results).pathname});
      }
      assert.equal(assets.some(a => a.url.endsWith('.js') && /javascript/.test(a.type)), true);
      assert.equal(assets.some(a => a.url.endsWith('.css') && /css/.test(a.type)), true);
      assert.deepEqual(errors, []);assert.deepEqual(badResponses, []);assert.deepEqual(external, []);
      await context.close();

      const broken = await browser.newPage();
      await broken.route('**/assets/*.js', route => route.abort());
      await broken.goto(host.origin + pagesBase);
      await broken.locator('#startup-retry:not([hidden])').waitFor({timeout: 10000});
      assert.match(await broken.locator('#startup-message').innerText(), /Не удалось загрузить/);
      await broken.close();

      const noWebGL = await browser.newPage();
      await noWebGL.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {return String(type).includes('webgl') ? null : original.call(this, type, ...args)};
      });
      await noWebGL.goto(host.origin + pagesBase);
      await noWebGL.locator('#startup-retry:not([hidden])').waitFor({timeout: 10000});
      assert.match(await noWebGL.locator('#startup-message').innerText(), /WebGL 2/);
      await noWebGL.close();
      reports.push({engine: name, launch: 'passed', subpath: pagesBase, controls: 'passed', orientations: ['390x844', '844x390', '320x568', '568x320', '360x800'], missingScriptMessage: 'passed', noWebGLMessage: 'passed', errors, badResponses, external});
      console.log(`PASS ${name}: rendered 3D, subpath JS/CSS, mobile controls, both orientations, asset/WebGL failure messages`);
    } finally {await browser.close()}
  }
  await writeFile(new URL('mobile-launch.json', results), JSON.stringify({testedAt: new Date().toISOString(), requestedEngines: requested, physicalIPhoneTested: false, reports}, null, 2) + '\n');
} finally {await host.close()}
