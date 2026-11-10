import {chromium,webkit} from 'playwright';
import {existsSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {servePages,pagesBase} from './pages-server.mjs';
const out=new URL('../test-results/user-journey/',import.meta.url);await mkdir(out,{recursive:true});
const host=await servePages(),reports=[];
const locations=['nebula','meridian','rust','comet','plankton','abyss','orbit','echo','cabin'];
const residents={nebula:['bip','zora','quik','plukh','borks','zip','lyra','grog','mira'],meridian:['tick','vella'],rust:['rusk','koro'],comet:['zhu','paf'],plankton:['nai','myxa'],abyss:['om','yul'],orbit:['aori','qbit'],echo:['il','oro'],cabin:[]};
const fixtures={fresh:null,r2:{version:'0.20.0',credits:255,mood:78,story:0,venue:'rust',visited:['nebula','rust'],decisions:['docks:open'],met:['zip'],relations:{zip:{points:7,greetDay:0,treatDay:0,gift:true}},quests:{party:'done',syrup:'done'}},v021:{schema:2,version:'0.21.0',credits:321,story:6,venue:'echo',visited:['nebula','echo'],inventory:[],decisions:['docks:open'],quests:{party:'done',syrup:'done'},jobs:{coil:{status:'done',progress:1}}}};
try{
 for(const [engineName,engine] of [['chromium',chromium],['webkit',webkit]]){
  if(!(process.env.SPACEBAR_BROWSERS||'chromium,webkit').split(',').includes(engineName))continue;
  const executablePath=engineName==='chromium'?(process.env.SPACEBAR_CHROMIUM||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined)):undefined;
  const b=await engine.launch({headless:true,...(executablePath?{executablePath}:{}),...(engineName==='chromium'?{args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']}: {})});
  try{
   for(const [profile,fixture] of Object.entries(fixtures)){
    const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[],dialogs=[];p.on('pageerror',e=>errors.push(e.message));
    if(fixture)await p.addInitScript(f=>{if(!localStorage.getItem('spacebar-restored-v020'))localStorage.setItem('spacebar-restored-v020',JSON.stringify(f))},fixture);
    await p.goto(host.origin+pagesBase+'?build=0.21.2');await p.locator('#startup[hidden]').waitFor({state:'attached'});assert.equal(await p.evaluate(()=>window.spaceBarTest),undefined);
    const snap=()=>p.evaluate(()=>window.spaceBar.getSnapshot());assert.equal((await snap()).version,'0.21.2');await p.locator('#flow-panel').waitFor();
    const tap=async(selector)=>{const e=p.locator(selector);await e.scrollIntoViewIfNeeded();const hit=await e.evaluate(el=>{const r=el.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {correct:top?.closest('button')===el,width:r.width,height:r.height}});assert.ok(hit.correct,'unblocked touch target '+selector);assert.ok(hit.height>=44,selector+' min 44px');await e.tap()};
    const close=async()=>{if((await snap()).paused)await tap('#dialog-dismiss')};
    const menu=async(action)=>{await close();await tap('#menu');await tap('[data-action="'+action+'"]')};
    const approach=async(id)=>{await menu('residents');const start=await snap();await tap('[data-action="approach-'+id+'"]');await p.waitForFunction(id=>{const s=window.spaceBar.getSnapshot();return !s.navigation&&s.selectedNpc===id&&s.flow.flow.code==='READY_TO_TALK'},id,{timeout:60000,polling:'raf'});const s=await snap();const distance=Math.hypot(s.player.x-start.player.x,s.player.z-start.player.z),seconds=s.state.worldTime-start.state.worldTime;assert.ok(distance<=seconds*3.6+.35,'walked without teleport '+id);assert.match(s.interaction,/Поговорить/);await tap('#interact');assert.equal((await snap()).paused,true);assert.equal((await snap()).selectedNpc,id);const title=await p.locator('#dialog-title').innerText();assert.equal(title,s.flow.flow.selectedNpc);dialogs.push({id,title,position:s.player,elapsedGameSeconds:seconds,straightDistance:distance});return title};
    if(profile==='fresh'){
     await menu('map');await tap('[data-action="travel-rust"]');assert.equal((await snap()).flow.flow.code,'PASS_MISSING');assert.equal((await snap()).state.venue,'nebula');assert.match(await p.locator('[data-notice]').innerText(),/пропуска/);assert.equal(await p.locator('[data-action="travel-rust"]').isDisabled(),false);await p.screenshot({path:new URL(engineName+'-missing-pass.png',out).pathname});
     await approach('borks');await tap('[data-action="story-borks"]');await close();await approach('zip');await tap('[data-action="story-witness"]');await close();await approach('lyra');await tap('[data-action="story-lyra"]');await tap('[data-action="story-clue"]');await close();await approach('mira');await tap('[data-action="digital-pass"]');await tap('[data-action="digital-answer"]');await close();
     assert.equal((await snap()).state.story,5);await menu('map');await tap('[data-action="travel-rust"]');assert.equal((await snap()).flow.flow.code,'DOCKS_NOT_VALIDATED');await tap('[data-action="validate-pass"]');assert.equal((await snap()).state.story,6);assert.equal((await snap()).state.credits,160);assert.equal(await p.locator('[data-action="validate-pass"]').count(),0);await close();
    }else{assert.equal((await snap()).state.story,6);assert.ok((await snap()).state.inventory.includes('station-pass'));assert.equal((await snap()).state.credits,fixture.credits);assert.ok(await p.evaluate(()=>!!localStorage.getItem('spacebar-restored-v020-backup-before-0211')))}
    const credits=(await snap()).state.credits,journeys=[];
    for(const id of locations){
     await menu('map');await tap('[data-action="travel-'+id+'"]');await p.waitForFunction(id=>{const s=window.spaceBar.getSnapshot();return s.world.renderedLocation===id&&!s.paused&&s.flow.flow.code==='CONTROLS_READY'},id,{timeout:20000});assert.equal((await snap()).state.venue,id);assert.equal((await snap()).state.credits,credits);
     const stages=(await snap()).flow.flow.events.map(e=>e.code);for(const stage of ['REQUESTED','PASS_CHECKED','BUILDING','FRAME_PRESENTED','STATE_COMMITTED','CONTROLS_READY'])assert.ok(stages.includes(stage),id+' '+stage);
     // Genuine touchscreen joystick movement, not keyboard or a scene-position test hook.
     const before=(await snap()).player,r=await p.locator('#joystick').boundingBox();
     if(engineName==='chromium'){const cdp=await p.context().newCDPSession(p);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2+30,y:r.y+r.height/2,id:1}]});await p.waitForTimeout(350);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach()}
     else{await p.touchscreen.tap(r.x+r.width/2+30,r.y+r.height/2);await p.mouse.move(r.x+r.width/2+30,r.y+r.height/2);await p.mouse.down();await p.waitForTimeout(350);await p.mouse.up()}
     const after=(await snap()).player;assert.ok(Math.hypot(after.x-before.x,after.z-before.z)>.15,id+' working movement after touch travel');
     journeys.push({id,rendered:(await snap()).world.renderedLocation,controlsReady:true});console.log(engineName+' '+profile+': '+id+' rendered and controlled');
     if(profile==='fresh')for(const npc of residents[id]){await approach(npc);await close()}
     await p.screenshot({path:new URL(engineName+'-'+profile+'-'+id+'.png',out).pathname});
    }
    await p.reload();await p.locator('#startup[hidden]').waitFor({state:'attached'});assert.equal((await snap()).state.venue,'cabin');assert.equal((await snap()).state.credits,credits);if(profile!=='fresh')assert.equal((await snap()).state.quests.syrup,'done');
    await p.setViewportSize({width:568,height:320});await menu('map');await tap('[data-action="travel-nebula"]');await approach('borks');await tap('#dialog-dismiss');assert.equal((await snap()).paused,false);await p.screenshot({path:new URL(engineName+'-'+profile+'-landscape.png',out).pathname});
    assert.deepEqual(errors,[]);reports.push({engine:engineName,profile,version:'0.21.2',journeys,dialogs,credits,persisted:true,productionOnly:true,physicalIPhoneTested:false,errors});console.log(`PASS ${engineName} ${profile}: full touch pass/menu/travel/control/approach/dialogue/save journey; ${dialogs.length} dialogues`);await p.close();
   }
  }finally{await b.close()}
 }
 await writeFile(new URL('results.json',out),JSON.stringify({testedAt:new Date().toISOString(),reports},null,2)+'\n');
}finally{await host.close()}
