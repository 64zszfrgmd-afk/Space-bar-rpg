import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {existsSync} from 'node:fs';
import {mkdir,readFile,stat,writeFile} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {chromium,webkit} from 'playwright';

const base='/Space-bar-rpg/',testBase=base+'test/0.21.1/',saveKey='spacebar-restored-v020',prefix='spacebar-test-0211:';
const output=resolve('test-results/pages-preview',process.env.SPACEBAR_LIVE_URL?'https':'staged');
await mkdir(output,{recursive:true});
let server;
const live=process.env.SPACEBAR_LIVE_URL;
let url=live;
if(!url){
 const folder=resolve('pages-preview');
 server=createServer(async(req,res)=>{
  try{
   const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   if(!path.startsWith(base)){res.writeHead(404).end();return}
   const file=resolve(folder,path.slice(base.length)||'index.html');
   if(!file.startsWith(folder+sep)){res.writeHead(403).end();return}
   const actual=(await stat(file)).isDirectory()?resolve(file,'index.html'):file;
   const mime=actual.endsWith('.js')?'application/javascript':actual.endsWith('.css')?'text/css':actual.endsWith('.json')?'application/json':'text/html';
   res.writeHead(200,{'content-type':mime,'cache-control':'no-store'}).end(await readFile(actual));
  }catch{res.writeHead(404).end()}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 url='http://127.0.0.1:'+server.address().port+testBase;
}
assert.equal(new URL(url).pathname,testBase);
if(live)assert.equal(new URL(url).protocol,'https:');
const reports=[];
try{
 const entry=await fetch(url);assert.equal(entry.status,200);
 const html=await entry.text();
 const assets=[...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g)].map(m=>m[1]).filter(path=>!path.startsWith('data:'));
 assert.ok(assets.length>=3);
 for(const path of assets){
  assert.ok(path.startsWith(testBase+'assets/'),path);
  const response=await fetch(new URL(path,url));assert.equal(response.status,200,path);
  assert.match(response.headers.get('content-type'),path.endsWith('.js')?/javascript/:/text\/css/);
 }
 const provenance=await (await fetch(new URL('preview-build.json',url))).json();
 assert.equal(provenance.version,'0.21.1');assert.equal(provenance.savePrefix,prefix);
 assert.equal((await (await fetch(new URL(base+'version.json',url))).json()).version,'0.21.0');
 for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
  if(!(process.env.SPACEBAR_BROWSERS||'chromium,webkit').split(',').includes(name))continue;
  const browser=await engine.launch({headless:true,...(name==='chromium'?{...(existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium'}:{}),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']}: {})});
  try{
   const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{if(r.url().includes(testBase+'assets/')&&r.status()>=400)errors.push(r.status()+' '+r.url())});
   const original=JSON.stringify({version:'0.21.0',credits:777,story:6,venue:'echo',inventory:['station-pass'],visited:['nebula','echo']});
   await page.addInitScript(({key,original})=>{if(!localStorage.getItem(key))localStorage.setItem(key,original)},{key:saveKey,original});
   await page.goto(url);
   const ready=()=>page.locator('#startup[hidden]').waitFor({state:'attached',timeout:30000});
   const snap=()=>page.evaluate(()=>window.spaceBar.getSnapshot());
   await ready();assert.equal((await snap()).version,'0.21.1');assert.equal((await snap()).state.credits,120);
   assert.equal((await snap()).state.story,0);assert.equal((await snap()).world.renderedLocation,'nebula');
   const tap=async(selector)=>{
    const target=page.locator(selector);await target.scrollIntoViewIfNeeded();
    assert.ok(await target.evaluate(e=>{const r=e.getBoundingClientRect();return r.height>=44&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===e}),selector);
    await target.tap();
   };
   const close=async()=>{if((await snap()).paused)await tap('#dialog-dismiss')};
   const menu=async(action)=>{await close();await tap('#menu');await tap('[data-action="'+action+'"]')};
   const approach=async(id)=>{
    await menu('residents');await tap('[data-action="approach-'+id+'"]');
    await page.waitForFunction(id=>{const s=window.spaceBar.getSnapshot();return !s.navigation&&s.selectedNpc===id&&s.flow.flow.code==='READY_TO_TALK'},id,{timeout:60000,polling:'raf'});
    await tap('#interact');const heading=await page.locator('#dialog-title').innerText();assert.equal((await snap()).selectedNpc,id);
    await page.screenshot({path:resolve(output,name+'-dialog-'+id+'.png')});await close();return heading;
   };
   await menu('map');await tap('[data-action="travel-rust"]');assert.equal((await snap()).flow.flow.code,'PASS_MISSING');
   await page.screenshot({path:resolve(output,name+'-fresh.png')});const dialogs=[await approach('borks')];
   const fixture={version:'0.20.0',credits:321,story:0,venue:'rust',visited:['nebula','rust'],decisions:['docks:open'],quests:{party:'done',syrup:'done'}};
   // Seed on the next document: the current game's pagehide handler saves before reload.
   await page.addInitScript(({key,value})=>{
    if(!sessionStorage.getItem('preview-fixture-loaded')){
     localStorage.setItem(key,JSON.stringify(value));sessionStorage.setItem('preview-fixture-loaded','yes');
    }
   },{key:prefix+saveKey,value:fixture});
   await page.reload();await ready();assert.equal((await snap()).state.story,6);assert.equal((await snap()).state.credits,321);
   const routes=[];
   for(const id of ['nebula','meridian','rust','comet','plankton','abyss','orbit','echo','cabin']){
    await menu('map');await tap('[data-action="travel-'+id+'"]');
    await page.waitForFunction(id=>{const s=window.spaceBar.getSnapshot();return s.world.renderedLocation===id&&!s.paused&&s.flow.flow.code==='CONTROLS_READY'},id,{timeout:20000});
    assert.equal((await snap()).state.venue,id);
    const before=(await snap()).player,r=await page.locator('#joystick').boundingBox();
    if(name==='chromium'){const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2+30,y:r.y+r.height/2,id:1}]});await page.waitForTimeout(350);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach()}
    else{await page.touchscreen.tap(r.x+r.width/2+30,r.y+r.height/2);await page.mouse.move(r.x+r.width/2+30,r.y+r.height/2);await page.mouse.down();await page.waitForTimeout(350);await page.mouse.up()}
    const after=(await snap()).player;assert.ok(Math.hypot(after.x-before.x,after.z-before.z)>.15,id+' controls');
    if(id==='rust')dialogs.push(await approach('rusk'));
    await page.screenshot({path:resolve(output,name+'-'+id+'.png')});routes.push(id);
   }
   await page.waitForTimeout(2200);
   assert.equal(await page.evaluate(key=>localStorage.getItem(key),saveKey),original);
   assert.equal(await page.evaluate(()=>localStorage.getItem('spacebar-restored-v020-backup-before-0211')),null);
   assert.equal(await page.evaluate(key=>localStorage.getItem(key),prefix+'spacebar-restored-v020-backup-before-0211'),JSON.stringify(fixture));
   assert.ok(await page.evaluate(key=>localStorage.getItem(key),prefix+saveKey));
   await page.reload();await ready();assert.equal((await snap()).state.venue,'cabin');assert.equal((await snap()).state.credits,321);
   assert.equal(await page.evaluate(key=>localStorage.getItem(key),saveKey),original);assert.deepEqual(errors,[]);
   reports.push({engine:name,url,version:'0.21.1',provenance,routes,dialogs,productionSaveUntouched:true,persisted:true,errors});
   console.log('PASS '+name+': '+url+'; real UI, 9 scenes and controls, dialogs, isolated save, reload');
  }finally{await browser.close()}
 }
 await writeFile(resolve(output,'results.json'),JSON.stringify({testedAt:new Date().toISOString(),reports},null,2)+'\n');
}finally{if(server)await new Promise(r=>server.close(r))}
