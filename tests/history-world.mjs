import {chromium,webkit} from 'playwright';
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {servePages,pagesBase} from './pages-server.mjs';
const requested=(process.env.SPACEBAR_BROWSERS||'chromium,webkit').split(',');
const host=await servePages(),results=new URL('../test-results/',import.meta.url);await mkdir(results,{recursive:true});
const dev=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5175','--strictPort'],{stdio:'pipe'});
let output='';dev.stdout.on('data',d=>output+=d);dev.stderr.on('data',d=>output+=d);
const devURL='http://127.0.0.1:5175'+pagesBase;
async function waitReady(){for(let i=0;i<100;i++){try{if((await fetch(devURL)).ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw Error(output)}
const reports=[];
try{
 await waitReady();
 for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
  if(!requested.includes(name))continue;
  const executablePath=name==='chromium'?(process.env.SPACEBAR_CHROMIUM||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined)):undefined;
  const browser=await engine.launch({headless:true,...(executablePath?{executablePath}:{}),...(name==='chromium'?{args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']}: {})});
  try{
   const errors=[];
   // Production editor/settings: no mutating scene access or test flag.
   const prod=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});prod.on('pageerror',e=>errors.push(e.message));
   await prod.goto(host.origin+pagesBase);await prod.locator('#startup[hidden]').waitFor({state:'attached'});assert.equal(await prod.evaluate(()=>window.spaceBarTest),undefined);
   await prod.locator('#menu').click();await prod.locator('[data-action="appearance"]').click();
   for(const species of ['human','crystal','mycelian','orbion','ribbon']){await prod.locator('[data-action="species-'+species+'"]').click();assert.equal(await prod.evaluate(()=>window.spaceBar.getSnapshot().state.hero.species),species)}
   await prod.locator('[data-action="accessory-hat"]').click();await prod.locator('[data-action="dance-style-2"]').click();await prod.locator('input[type="text"]').fill('Новый странник');await prod.locator('[data-action="hero-save"]').click();await prod.keyboard.press('Escape');
   await prod.locator('#menu').click();await prod.locator('[data-action="settings"]').click();await prod.locator('[data-action="quality-low"]').click();await prod.locator('input[type="range"]').fill('0');await prod.locator('[data-action="volume-save"]').click();await prod.reload();await prod.locator('#startup[hidden]').waitFor({state:'attached'});
   const persisted=await prod.evaluate(()=>window.spaceBar.getSnapshot());assert.equal(persisted.revision,'touch-flow-1');assert.equal(persisted.state.hero.name,'Новый странник');assert.equal(persisted.state.hero.species,'ribbon');assert.equal(persisted.state.hero.accessory,'hat');assert.equal(persisted.state.hero.dance,2);assert.deepEqual(persisted.state.settings,{quality:'low',volume:0});await prod.screenshot({path:new URL(name+'-playable-alien.png',results).pathname});await prod.close();
   console.log(name+': production five species, accessories, name, quality and sound persist');
   for(const route of ['digital','physical']){
    const page=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{window.__SPACEBAR_TEST__=true});await page.goto(devURL);await page.locator('#startup[hidden]').waitFor({state:'attached'});await page.waitForFunction(()=>!!window.spaceBarTest);
    const snapshot=()=>page.evaluate(()=>window.spaceBar.getSnapshot());
    const close=async()=>{if((await snapshot()).paused)await page.keyboard.press('Escape')};
    const at=async(x,z)=>{await page.evaluate(p=>{if(!window.spaceBarTest.canMove(p.x,p.z))throw Error('Target is blocked '+JSON.stringify(p));window.spaceBarTest.player.position.set(p.x,0,p.z)}, {x,z});await page.keyboard.press('e')};
    const map=async(id)=>{await close();await page.locator('#menu').click();await page.locator('[data-action="map"]').click();await page.locator('[data-action="travel-'+id+'"]').click();assert.equal((await snapshot()).state.venue,id)};
    await page.locator('#menu').click();await page.locator('[data-action="map"]').click();await page.locator('[data-action="travel-echo"]').tap();assert.equal((await snapshot()).flow.flow.code,'PASS_MISSING');assert.equal((await snapshot()).state.venue,'nebula');await close();
    await at(-6.7,-4.2);await page.locator('[data-action="story-borks"]').click();await close();await at(-2.1,1.7);await page.locator('[data-action="story-witness"]').click();await close();await at(3,-4.6);await page.locator('[data-action="story-lyra"]').click();await page.locator('[data-action="story-clue"]').click();await close();
    if(route==='digital'){await at(8,1.4);await page.locator('[data-action="digital-pass"]').click();await page.locator('[data-action="digital-answer"]').click();await close()}else await at(-5.2,5.4);
    assert.equal((await snapshot()).state.story,5);assert.ok((await snapshot()).state.decisions.includes('pass:'+route));await at(0,7.8);assert.equal((await snapshot()).state.story,6);assert.equal((await snapshot()).state.credits,160);await close();
    if(route==='physical'){await map('rust');await page.reload();await page.locator('#startup[hidden]').waitFor({state:'attached'});assert.equal((await snapshot()).state.venue,'rust');assert.equal((await snapshot()).state.story,6);await page.close();continue}
    const approaches={};
    const geometry=async()=>page.evaluate(()=>{
     const t=window.spaceBarTest,step=.25,key=(x,z)=>x+','+z,queue=[[0,-2]],seen=new Set([key(0,-2)]);let i=0;
     while(i<queue.length){const [x,z]=queue[i++];for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,k=key(nx,nz);if(!seen.has(k)&&t.canMove(nx*step,nz*step)){seen.add(k);queue.push([nx,nz])}}}
     const points=queue.map(([x,z])=>({x:x*step,z:z*step}));
     const find=(title)=>points.find(p=>{t.player.position.set(p.x,0,p.z);return window.spaceBar.getSnapshot().interaction===title});
     const npcs=t.npcs.map(n=>({id:n.id,point:find('Поговорить · '+n.name)})),seats=t.seats.map(s=>({id:s.id,point:find('Сесть · '+s.name)}));
     const exit=find('Выход · доки и карта');t.player.position.set(0,0,-.5);return {npcs,seats,exit,reachable:seen.size};
    });
    const ids=['nebula','meridian','rust','comet','plankton','abyss','orbit','echo','cabin'];
    for(const id of ids){await map(id);const room=await geometry();assert.ok(room.reachable>2000,id+' connected floor');assert.ok(room.exit,id+' exit');for(const n of room.npcs)assert.ok(n.point,id+' NPC '+n.id);for(const s of room.seats)assert.ok(s.point,id+' seat '+s.id);approaches[id]=room;
     const seat=room.seats[0];await at(seat.point.x,seat.point.z);assert.equal((await snapshot()).seated,seat.id);await page.keyboard.press('e');assert.equal((await snapshot()).seated,null);assert.ok(await page.evaluate(()=>{const p=window.spaceBarTest.player.position;return window.spaceBarTest.canMove(p.x,p.z)}));await page.screenshot({path:new URL(name+'-venue-'+id+'.png',results).pathname});}
    assert.equal((await snapshot()).state.visited.length,9);console.log(name+': both main-story access checks; all nine rooms/NPCs/seats/exits reachable');
    const npc=async(venue,id)=>{if((await snapshot()).state.venue!==venue)await map(venue);await close();const p=approaches[venue].npcs.find(n=>n.id===id).point;await at(p.x,p.z)};
    const accept=async(venue,id,job)=>{await npc(venue,id);await page.locator('[data-action="job-'+job+'"]').click();await page.locator('[data-action="job-accept-'+job+'"]').click();await close()};
    const claim=async(venue,id,job)=>{await npc(venue,id);await page.locator('[data-action="job-claim-'+job+'"]').click();assert.equal(await page.locator('[data-action="job-claim-'+job+'"]').count(),0);await close()};
    await accept('meridian','tick','beat');await page.evaluate(()=>window.spaceBarTest.player.position.set(1,0,3));await page.locator('#menu').click();await page.locator('[data-action="rhythm-start"]').click();
    for(let beat=0;beat<8;beat++){await page.waitForFunction(i=>{const s=window.spaceBar.getSnapshot();return s.rhythm&&s.state.worldTime>=s.rhythm.start+i*.75-.03},beat,{polling:'raf',timeout:20000});await page.keyboard.press('Space')}
    await page.waitForFunction(()=>window.spaceBar.getSnapshot().rhythm===null,null,{timeout:10000});assert.equal((await snapshot()).state.jobs.beat.status,'ready');await claim('meridian','tick','beat');
    await accept('rust','rusk','coil');await at(-8.5,-.5);await claim('rust','rusk','coil');
    await accept('comet','paf','parcel');await npc('orbit','aori');await page.locator('[data-action="job-deliver-parcel"]').click();await close();
    await accept('orbit','qbit','letter');await npc('nebula','borks');await page.locator('[data-action="job-deliver-letter"]').click();await close();await claim('orbit','qbit','letter');await claim('comet','paf','parcel');
    await accept('plankton','myxa','shells');for(const [x,z] of [[-8.5,-.5],[7.8,2.5],[-2.8,-4.5]])await at(x,z);await claim('plankton','myxa','shells');
    await accept('abyss','om','quiet');const seat=approaches.abyss.seats[0];await at(seat.point.x,seat.point.z);await page.waitForFunction(()=>window.spaceBar.getSnapshot().state.jobs.quiet.status==='ready',null,{timeout:50000});await page.keyboard.press('e');await claim('abyss','om','quiet');
    await accept('echo','il','stars');await at(4.5,-1);await page.locator('[data-action="stars-answer"]').click();await claim('echo','il','stars');
    const complete=await snapshot();assert.equal(Object.values(complete.state.jobs).filter(j=>j.status==='done').length,7);assert.equal(complete.state.buzz,0);assert.ok(complete.state.credits>=440);
    await map('cabin');await at(3.2,3.4);assert.equal((await snapshot()).state.energy,100);assert.equal((await snapshot()).state.buzz,0);await at(-9.4,-1.5);await page.locator('[data-action="species-orbion"]').click();await close();await page.reload();await page.locator('#startup[hidden]').waitFor({state:'attached'});assert.equal((await snapshot()).state.hero.species,'orbion');assert.equal((await snapshot()).state.venue,'cabin');assert.equal(Object.values((await snapshot()).state.jobs).filter(j=>j.status==='done').length,7);await page.close();
   }
   assert.deepEqual(errors,[]);reports.push({engine:name,productionEditorAndSettings:true,storyRoutes:['physical','digital'],destinations:9,npcs:23,allGeometryReachable:true,localQuestsCompleted:7,rhythmAndRest:true,oldVersionRegressions:'separate gameplay.mjs',physicalIPhoneTested:false,errors});console.log('PASS '+name+': history restoration, two story routes, 9 destinations, 23 NPCs, 7 local quests, five heroes, settings, cabin and save reload');
  }finally{await browser.close()}
 }
 await writeFile(new URL('history-world.json',results),JSON.stringify({testedAt:new Date().toISOString(),reports},null,2)+'\n');
}finally{dev.kill();await host.close()}
