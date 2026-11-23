import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {servePages,pagesBase} from './pages-server.mjs';

const base=process.env.SPACEBAR_EDITOR_BASE||pagesBase,live=process.env.SPACEBAR_EDITOR_URL;
const host=live?null:await servePages({folder:process.env.SPACEBAR_EDITOR_FOLDER,base});
const url=live||host.origin+base,prefix=process.env.SPACEBAR_EDITOR_SAVE_PREFIX||'',key=prefix+'spacebar-restored-v020';
const out=resolve('test-results/editor-tabs',live?'https':'staged');await mkdir(out,{recursive:true});const reports=[];
const fixture={version:'0.21.3',credits:543,energy:85,mood:65,story:6,travelUnlocked:true,venue:'nebula',visited:['nebula'],inventory:['station-pass'],quests:{party:'done',syrup:'done'},decisions:['docks:open'],jobs:{coil:{status:'done',progress:1}},met:['zip'],relations:{zip:{points:7,greetDay:0,treatDay:0,gift:true}},hero:{name:'Старый путешественник',species:'human',color:'#f2c19e',accessory:'none',dance:2}};
const stableMain=JSON.stringify({version:'0.21.0',credits:777}),legacy=JSON.stringify(fixture);
try{
 for(const [engineName,engine] of [['chromium',chromium],['webkit',webkit]]){
  if(!(process.env.SPACEBAR_BROWSERS||'chromium,webkit').split(',').includes(engineName))continue;
  const browser=await engine.launch({headless:true,...(engineName==='chromium'?{...(existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium'}:{}),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']}: {})});
  try{
   const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[],dances=[],layouts=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(({fixture,key,prefix,stableMain,legacy})=>{
    if(prefix){if(!localStorage.getItem('spacebar-restored-v020'))localStorage.setItem('spacebar-restored-v020',stableMain);if(!localStorage.getItem('spacebar-test-0213:spacebar-restored-v020'))localStorage.setItem('spacebar-test-0213:spacebar-restored-v020',legacy)}
    else if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(fixture));
   },{fixture,key,prefix,stableMain,legacy});
   await page.goto(url);const ready=()=>page.locator('#startup[hidden]').waitFor({state:'attached',timeout:30000});await ready();
   const snap=()=>page.evaluate(()=>window.spaceBar.getSnapshot());assert.equal(await page.evaluate(()=>window.spaceBarTest),undefined);assert.equal((await snap()).state.credits,543);assert.equal((await snap()).state.hero.dance,2);
   const progress=s=>({credits:s.credits,story:s.story,quests:s.quests,jobs:s.jobs,inventory:s.inventory,relations:s.relations,met:s.met});const initialProgress=progress((await snap()).state);
   const tap=async selector=>{const el=page.locator(selector);await el.scrollIntoViewIfNeeded();assert.ok(await el.evaluate(b=>{const r=b.getBoundingClientRect();return r.height>=44&&r.width>=44&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===b}),'unblocked 44px target: '+selector);await el.tap()};
   const tab=async id=>{await tap('[data-action="hero-tab-'+id+'"]');assert.equal(await page.locator('[role=tab][aria-selected=true]').count(),1);assert.equal(await page.locator('#hero-tab-panel').getAttribute('data-editor-tab'),id)};
   const close=async()=>{if((await snap()).paused)await tap('#dialog-dismiss')};
   const editor=async()=>{await close();await tap('#menu');await tap('[data-action="appearance"]')};
   const shot=async name=>{const file=engineName+'-'+name+'.png';await page.screenshot({path:resolve(out,file)});return file};
   await editor();assert.equal(await page.locator('[data-action^="species-"]').count(),5);assert.equal(await page.locator('[data-action^="dance-style-"]').count(),0);assert.equal(await page.locator('#hero-name').count(),0);
   await tab('dances');assert.equal(await page.locator('[data-action^="species-"]').count(),0);assert.deepEqual((await page.locator('[data-action^="dance-style-"]').allInnerTexts()).map(t=>t.replace(/^✓ /,'')),['Орбитальный шаг','Лунный шаффл','Волна щупалец']);assert.equal(await page.locator('[data-action="dance-style-2"]').getAttribute('aria-pressed'),'true');await tap('[data-action="editor-dance"]');assert.equal((await snap()).dancing,false);assert.match(await page.locator('[data-notice]').innerText(),/танцпол/);
   await tab('appearance');await page.locator('#hero-name').fill('Лунный гость');await page.locator('#hero-color').fill('#ff8844');await tab('character');await tap('[data-action="species-orbion"]');await tab('dances');await tap('[data-action="dance-style-1"]');await tab('appearance');assert.equal(await page.locator('#hero-name').inputValue(),'Лунный гость');assert.equal(await page.locator('#hero-color').inputValue(),'#ff8844');await tap('[data-action="accessory-hat"]');assert.equal(await page.locator('#hero-name').inputValue(),'Лунный гость');await tap('[data-action="hero-save"]');assert.equal((await snap()).state.hero.species,'orbion');assert.equal((await snap()).state.hero.dance,1);assert.equal((await snap()).state.hero.name,'Лунный гость');await close();
   // Real joystick input to the dance floor, no production scene mutators.
   const cdp=engineName==='chromium'?await page.context().newCDPSession(page):null;let held=false;
   const release=async()=>{if(!held)return;if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.mouse.up();held=false};
   for(let i=0;i<180;i++){
    const s=await snap();if(Math.abs(s.player.z-2.8)<.25)break;const dx=-s.player.x,dz=2.8-s.player.z,len=Math.hypot(dx,dz),yaw=s.camera.yaw,speed=Math.min(.8,len*1.5),r=await page.locator('#joystick').boundingBox(),point={x:r.x+r.width/2+(dx*Math.cos(yaw)-dz*Math.sin(yaw))/len*speed*35,y:r.y+r.height/2+(dx*Math.sin(yaw)+dz*Math.cos(yaw))/len*speed*35};
    if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:held?'touchMove':'touchStart',touchPoints:[{...point,id:1}]});else{await page.mouse.move(point.x,point.y);if(!held)await page.mouse.down()}held=true;await page.waitForTimeout(90);
   }await release();assert.ok((await snap()).player.z>1.3&&(await snap()).player.z<5.7);
   for(const species of ['human','crystal','mycelian','orbion','ribbon']){
    for(const style of [0,1,2]){
     await editor();await tap('[data-action="species-'+species+'"]');assert.equal((await snap()).avatar.renderedSpecies,species);await tab('dances');await tap('[data-action="dance-style-'+style+'"]');assert.equal((await snap()).state.hero.species,species);const initialYaw=(await snap()).flow.avatarTransform.rotation[1];await tap('[data-action="editor-dance"]');assert.equal((await snap()).paused,false);assert.equal((await snap()).dancing,true);assert.equal((await snap()).state.hero.dance,style);
     await page.waitForFunction(({style,initialYaw})=>{const s=window.spaceBar.getSnapshot(),p=s.heroModel.pose;return s.dancing&&!s.paused&&(style===0?Math.abs(s.flow.avatarTransform.rotation[1]-initialYaw)>.01:style===1?Math.abs(p['leg-left'].rotation[0]+p['leg-right'].rotation[0])<.01&&Math.abs(p['leg-left'].rotation[0])>.05:p['arm-left'].rotation[0]<-.7)},{style,initialYaw},{timeout:5000,polling:'raf'});
     const samples=[],pixels=[],transforms=[];for(let beat=0;beat<4;beat++){await page.waitForTimeout(160);const s=await snap();samples.push(s.heroModel);transforms.push(s.flow.avatarTransform);const frame=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>resolve(document.querySelector('#scene canvas').toDataURL()))));pixels.push(createHash('sha256').update(frame).digest('hex'))}
     assert.ok(new Set(samples.map(s=>JSON.stringify(s.pose))).size>1,species+' moving joints');assert.ok(new Set(pixels).size>1,species+' changing actual rendered frames');
     if(species==='orbion'||species==='ribbon'){assert.ok(samples[0].appendagePose.length>1);assert.ok(new Set(samples.map(s=>JSON.stringify(s.appendagePose))).size>1,species+' visible appendages animated')}
     if(style===0)assert.ok(Math.abs(transforms.at(-1).rotation[1]-transforms[0].rotation[1])>.01,'orbital spin actually runs');
     if(style===1)assert.ok(samples.every(s=>Math.abs(s.pose['leg-left'].rotation[0]+s.pose['leg-right'].rotation[0])<.01),'shuffle alternates opposing steps');
     if(style===2)assert.ok(samples.every(s=>s.pose['arm-left'].rotation[0]<-.7),'wave keeps the arms raised');
     const screenshot=await shot(species+'-dance-'+style);dances.push({species,style,signature:samples[0].signature,samples,transforms,pixelHashes:pixels,screenshot});console.log(engineName+': '+species+' dance '+style+' moves the real model and framebuffer');await tap('#dance');assert.equal((await snap()).dancing,false);
    }
   }
   // Mobile tabs, scrolling, keyboard roving focus, appearance save and close controls.
   for(const [width,height] of [[320,568],[375,667],[390,844],[568,320],[667,375]]){
    await page.setViewportSize({width,height});await editor();const tabs=await page.locator('[role=tab]').evaluateAll(items=>items.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}}));for(const r of tabs)assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=width+1&&r.y+r.height<=height+1&&r.height>=44);
    assert.equal(await page.locator('[data-action^="species-"]').count(),5);const character=await shot('layout-'+width+'x'+height+'-character');await tab('dances');if(height<500)assert.ok(await page.locator('[data-action^="dance-style-"], [data-action="editor-dance"]').evaluateAll(items=>items.every(e=>{const r=e.getBoundingClientRect(),body=e.closest('.modal-body').getBoundingClientRect();return r.top>=body.top&&r.bottom<=body.bottom+1&&r.height>=44})), 'all landscape dance controls visible without scrolling');await tap('[data-action="dance-style-2"]');const dance=await shot('layout-'+width+'x'+height+'-dances');await tab('appearance');await page.locator('#hero-name').fill('Гость '+width);await tap('[data-action="hero-save"]');await tap('[data-action="accessory-none"]');const appearance=await shot('layout-'+width+'x'+height+'-appearance');
    const active=page.locator('[role=tab][aria-selected=true]');await active.focus();await page.keyboard.press('Home');assert.equal(await page.locator('[role=tab][aria-selected=true]').innerText(),'Персонаж');await page.keyboard.press('ArrowRight');assert.equal(await page.locator('[role=tab][aria-selected=true]').innerText(),'Танцы');await page.keyboard.press('End');assert.equal(await page.locator('[role=tab][aria-selected=true]').innerText(),'Внешность');
    await page.locator('#hero-name').focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'hero-color');
    assert.deepEqual(await page.evaluate(()=>[scrollX,scrollY,document.documentElement.scrollWidth<=innerWidth]),[0,0,true]);layouts.push({width,height,tabs,character,dance,appearance});await close();
   }
   await page.setViewportSize({width:390,height:844});await tap('#menu');await tap('[data-action="map"]');await tap('[data-action="travel-rust"]');await page.waitForFunction(()=>window.spaceBar.getSnapshot().world.renderedLocation==='rust');const before=await snap();assert.equal(before.state.hero.species,'ribbon');assert.equal(before.state.hero.dance,2);assert.deepEqual(progress(before.state),initialProgress);
   await page.reload();await ready();const after=await snap();assert.equal(after.state.venue,'rust');assert.deepEqual(after.state.hero,before.state.hero);assert.deepEqual(progress(after.state),initialProgress);await editor();await tab('dances');assert.equal(await page.locator('[data-action="dance-style-2"]').getAttribute('aria-pressed'),'true');
   if(prefix){assert.equal(await page.evaluate(()=>localStorage.getItem('spacebar-restored-v020')),stableMain);assert.equal(await page.evaluate(()=>localStorage.getItem('spacebar-test-0213:spacebar-restored-v020')),legacy)}
   assert.deepEqual(errors,[]);reports.push({engine:engineName,version:after.version,live:!!live,base,prefix,dances,layouts,progressPreserved:true,reload:true,travel:true,errors,physicalIPhoneTested:false});console.log('PASS '+engineName+': three tabs, 15 real world dances, small screen scrolling, saved drafts, travel and reload');await page.close();
  }finally{await browser.close()}
 }
 await writeFile(resolve(out,'results.json'),JSON.stringify({reports},null,2)+'\n');
 const html='<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Редактор героя · проверка</title><style>body{background:#17132b;color:#eee;font:16px system-ui}section{display:flex;overflow:auto;gap:12px}img{width:220px}article{min-width:220px}</style><h1>Три вкладки и три танца каждого вида</h1><p>Реальные кнопки и основная игровая сцена. Chromium/WebKit на Linux; физический iPhone проверяет владелец.</p>'+reports.map(r=>'<h2>'+r.engine+'</h2><section>'+r.dances.map(d=>'<article><img src="'+d.screenshot+'"><p>'+d.species+' · танец '+d.style+'</p></article>').join('')+'</section>'+r.layouts.map(l=>'<h3>'+l.width+'×'+l.height+'</h3><section>'+[l.character,l.dance,l.appearance].map(f=>'<article><img src="'+f+'"></article>').join('')+'</section>').join('')).join('')+'<a href="results.json">JSON отчёта</a>';
 await writeFile(resolve(out,'index.html'),html);
}finally{if(host)await host.close()}
