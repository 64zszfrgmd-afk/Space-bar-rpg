import {chromium,webkit} from 'playwright';
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {servePages,pagesBase} from './pages-server.mjs';
const requested=(process.env.SPACEBAR_BROWSERS||'chromium,webkit').split(',');
const host=await servePages(),results=new URL('../test-results/',import.meta.url);await mkdir(results,{recursive:true});
const dev=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5174','--strictPort'],{stdio:'pipe'});
let devLog='';dev.stdout.on('data',d=>devLog+=d);dev.stderr.on('data',d=>devLog+=d);
const devURL='http://127.0.0.1:5174'+pagesBase;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(url){for(let i=0;i<100;i++){try{if((await fetch(url)).ok)return}catch{}await delay(100)}throw Error('Dev server did not start: '+devLog)}
const reports=[];
try{
 await ready(devURL);
 for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
  if(!requested.includes(name))continue;
  const executablePath=name==='chromium'?(process.env.SPACEBAR_CHROMIUM||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined)):undefined;
  const browser=await engine.launch({headless:true,...(executablePath?{executablePath}:{}),...(name==='chromium'?{args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']}: {})});
  try{
   const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{if(!localStorage.getItem('browser-seeded')){localStorage.setItem('spacebar-v1',JSON.stringify({credits:500,mood:40,buzz:50,met:['Зора · навигатор']}));localStorage.setItem('spacebar-save-v2','untouched');localStorage.setItem('browser-seeded','1')}});
   await page.goto(host.origin+pagesBase);await page.locator('#startup[hidden]').waitFor({state:'attached'});
   assert.equal(await page.evaluate(()=>window.spaceBar.version),'0.21.1');assert.equal(await page.evaluate(()=>window.spaceBarTest),undefined);
   const snap=()=>page.evaluate(()=>window.spaceBar.getSnapshot());
   assert.ok((await snap()).state.met.includes('zora'));console.log(name+': production keyboard route to Borks');
   // Actual keyboard travel in production; no teleport or mutable test bridge.
   for(const [key,axis,value] of [['a','x',-6.7],['w','z',-4.2]]){await page.keyboard.down(key);try{await page.waitForFunction(({axis,value})=>window.spaceBar.getSnapshot().player[axis]<=value,{axis,value},{timeout:25000,polling:'raf'})}finally{await page.keyboard.up(key)}}
   await page.keyboard.press('e');await page.getByRole('heading',{name:'Боркс · шестирукий бармен'}).waitFor();
   assert.equal(await page.locator('[data-action^="drink-"]').count(),7);
   let before=(await snap()).state;
   await page.locator('[data-action="drink-quantum-ruff"]').click();await page.locator('[data-action="cancel-purchase"]').click();assert.equal((await snap()).state.credits,before.credits);
   const catalog=[['quantum-ruff',15,-4,8,18],['supernova-tears',24,-8,14,28],['dark-matter',30,-12,18,36],['antigravity',22,10,10,12],['singularity',12,20,8,-10],['cucumber',15,0,5,20],['water',0,0,0,-25]];
   for(const [id,price,energy,mood,buzz] of catalog){before=(await snap()).state;await page.locator('[data-action="drink-'+id+'"]').click();await page.locator('[data-action="confirm-purchase"]').click();const after=(await snap()).state;assert.equal(after.credits,before.credits-price,id);for(const [key,effect] of [['energy',energy],['mood',mood],['buzz',buzz]])assert.equal(after[key],Math.max(0,Math.min(100,before[key]+effect)),id+' '+key)}
   await page.screenshot({path:new URL(name+'-borks-menu.png',results).pathname});
   const saved=(await snap()).state;await page.reload();await page.locator('#startup[hidden]').waitFor({state:'attached'});assert.equal((await snap()).state.credits,saved.credits);assert.equal(await page.evaluate(()=>localStorage.getItem('spacebar-save-v2')),'untouched');assert.equal(JSON.parse(await page.evaluate(()=>localStorage.getItem('spacebar-v1'))).credits,500);
   await page.close();
   // Dev-only geometry/interaction harness; production above exposes read-only snapshots only.
   const game=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});game.on('pageerror',e=>errors.push(e.message));
   await game.addInitScript(()=>{window.__SPACEBAR_TEST__=true;localStorage.setItem('spacebar-v1',JSON.stringify({credits:120,mood:40,buzz:0,energy:35,met:[]}))});
   await game.goto(devURL);await game.locator('#startup[hidden]').waitFor({state:'attached'});await game.waitForFunction(()=>!!window.spaceBarTest);
   console.log(name+': production drink/save checks passed; geometry next');
   const geometry=await game.evaluate(()=>{
    const t=window.spaceBarTest,step=.25,key=(x,z)=>x+','+z,queue=[[0,-2]],seen=new Set([key(0,-2)]);let i=0;
    while(i<queue.length){const [x,z]=queue[i++];for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,k=key(nx,nz);if(!seen.has(k)&&t.canMove(nx*step,nz*step)){seen.add(k);queue.push([nx,nz])}}}
    const approaches=t.seats.map(seat=>{const p=queue.map(([x,z])=>({x:x*step,z:z*step})).filter(p=>Math.hypot(p.x-seat.x,p.z-seat.z)<2.05).find(p=>{t.player.position.set(p.x,0,p.z);return window.spaceBar.getSnapshot().interaction==='Сесть · '+seat.name});return {id:seat.id,point:p}});
    return {seats:t.seats.length,approaches,arms:t.npcs.find(n=>n.id==='borks').mesh.children.filter(c=>c.name.startsWith('borks-arm-')).length,reachable:seen.size};
   });
   assert.equal(geometry.seats,10);assert.equal(geometry.arms,6);assert.ok(geometry.reachable>1000);
   console.log(name+': ten connected seat approaches found');
   for(const seat of geometry.approaches){assert.ok(seat.point,'reachable '+seat.id);await game.evaluate(p=>window.spaceBarTest.player.position.set(p.x,0,p.z),seat.point);await game.keyboard.press('e');await game.waitForFunction(id=>window.spaceBar.getSnapshot().seated===id,seat.id);const energy=await game.evaluate(()=>window.spaceBar.getSnapshot().state.energy);await game.waitForTimeout(180);assert.ok(await game.evaluate(e=>window.spaceBar.getSnapshot().state.energy>e,energy),'seated energy');await game.keyboard.press('v');assert.equal(await game.evaluate(()=>window.spaceBar.getSnapshot().firstPerson),true);await game.keyboard.press('v');await game.keyboard.press('e');assert.equal(await game.evaluate(()=>window.spaceBar.getSnapshot().seated),null);assert.ok(await game.evaluate(()=>{const p=window.spaceBarTest.player.position;return window.spaceBarTest.canMove(p.x,p.z)}))}
   console.log(name+': all ten seats and exits passed; quests next');
   const go=async(x,z)=>{await game.evaluate(p=>window.spaceBarTest.player.position.set(p.x,0,p.z),{x,z});await game.keyboard.press('e')};
   await go(-3.4,-4.2);assert.equal(await game.locator('[data-action^="drink-"]').count(),4);await game.keyboard.press('Escape');
   await go(-2.1,1.7);await game.locator('[data-action="quest-party"]').click();await game.locator('[data-action="accept-party"]').click();await game.keyboard.press('Escape');
   await go(-9,3.1);await game.locator('[data-action="meet"]').click();await game.keyboard.press('Escape');await go(9,-3);await game.locator('[data-action="meet"]').click();await game.keyboard.press('Escape');
   await game.evaluate(()=>window.spaceBarTest.player.position.set(1,0,3));await game.keyboard.press('f');await game.waitForFunction(()=>window.spaceBar.getSnapshot().state.quests.party==='ready',null,{timeout:65000});await game.keyboard.press('f');
   await go(-2.1,1.7);await game.locator('[data-action="claim-party"]').click();assert.equal(await game.evaluate(()=>window.spaceBar.getSnapshot().state.credits),170);assert.equal(await game.locator('[data-action="claim-party"]').count(),0);
   await game.locator('[data-action="quest-syrup"]').click();await game.locator('[data-action="accept-syrup"]').click();await game.keyboard.press('Escape');await go(-9,-1);assert.equal(await game.evaluate(()=>window.spaceBar.getSnapshot().state.syrupStage),1);
   await go(-6.7,-4.2);await game.locator('[data-action="deliver"]').click();await game.keyboard.press('Escape');await go(-2.1,1.7);await game.locator('[data-action="claim-syrup"]').click();assert.equal(await game.evaluate(()=>window.spaceBar.getSnapshot().state.credits),255);assert.equal(await game.evaluate(()=>window.spaceBar.getSnapshot().state.buzz),0);await game.keyboard.press('Escape');
   await game.locator('#menu').click();const paused=await game.evaluate(()=>window.spaceBar.getSnapshot().state.worldTime);await game.waitForTimeout(300);assert.equal(await game.evaluate(()=>window.spaceBar.getSnapshot().state.worldTime),paused);await game.locator('[data-action="resume"]').click();
   await game.screenshot({path:new URL(name+'-restored-world.png',results).pathname});
   // Independent simultaneous touch joystick, camera and run. Blur must clear all captures.
   const energyBeforeTouch=await game.evaluate(()=>window.spaceBar.getSnapshot().state.energy);
   const touch=await game.evaluate(()=>{
    const fire=(el,type,id,x,y)=>el.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'touch',clientX:x,clientY:y,bubbles:true,buttons:type==='pointerup'?0:1}));
    // Synthetic IDs have no native capture. Test handlers directly while preserving real browser input elsewhere.
    const original=HTMLElement.prototype.setPointerCapture;HTMLElement.prototype.setPointerCapture=function(){};
    const joy=document.getElementById('joystick'),r=joy.getBoundingClientRect(),canvas=document.querySelector('#scene canvas'),run=document.getElementById('run');
    window.spaceBarTest.player.position.set(0,0,-.5);fire(joy,'pointerdown',51,r.x+r.width/2+30,r.y+r.height/2);fire(canvas,'pointerdown',52,300,350);fire(run,'pointerdown',53,60,600);fire(canvas,'pointermove',52,335,350);HTMLElement.prototype.setPointerCapture=original;return true;
   });assert.ok(touch);await game.waitForTimeout(350);const inMotion=await game.evaluate(()=>window.spaceBar.getSnapshot());assert.ok(Math.hypot(inMotion.player.x,inMotion.player.z+.5)>.15);assert.ok(inMotion.state.energy<energyBeforeTouch);assert.ok(Math.abs(inMotion.camera.yaw)>.1);await game.evaluate(()=>dispatchEvent(new Event('blur')));const stopped=await game.evaluate(()=>window.spaceBar.getSnapshot().player);await game.waitForTimeout(200);const stoppedAfter=await game.evaluate(()=>window.spaceBar.getSnapshot().player);assert.equal(stoppedAfter.x,stopped.x);assert.equal(stoppedAfter.z,stopped.z);
   assert.deepEqual(errors,[]);await game.close();reports.push({engine:name,productionMigration:true,sevenConfirmedDrinks:true,cancelUnchanged:true,legacyRecipes:4,seats:10,arms:6,twoQuestCompletionWithoutAlcohol:true,safeExits:true,pause:true,touchReset:true,errors});console.log('PASS '+name+': production purchases/save migration, 10 reachable seats, six arms, both quests without alcohol, pause and touch reset');
  }finally{await browser.close()}
 }
 await writeFile(new URL('gameplay.json',results),JSON.stringify({testedAt:new Date().toISOString(),physicalIPhoneTested:false,reports},null,2)+'\n');
}finally{dev.kill();await host.close()}
