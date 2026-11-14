import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {servePages,pagesBase} from './pages-server.mjs';

const live=process.env.SPACEBAR_HERO_URL,base=process.env.SPACEBAR_HERO_BASE||pagesBase;
const host=live?null:await servePages({folder:process.env.SPACEBAR_HERO_FOLDER,base});
const url=live||host.origin+base,prefix=process.env.SPACEBAR_HERO_SAVE_PREFIX||'',key=prefix+'spacebar-restored-v020';
const output=resolve('test-results/hero-appearance',live?'https':'staged');await mkdir(output,{recursive:true});
const ids=['human','crystal','mycelian','orbion','ribbon'],names=['Путешественник','Кристаллид','Мицелиец','Орбион','Лентокрыл'],reports=[];
const fixture={version:'0.21.2',credits:321,energy:76,mood:82,buzz:0,story:6,travelUnlocked:true,venue:'nebula',visited:['nebula','rust'],inventory:['station-pass'],decisions:['docks:open','pass:digital'],quests:{party:'done',syrup:'done'},jobs:{coil:{status:'done',progress:1}},met:['zip'],relations:{zip:{points:7,greetDay:0,treatDay:0,gift:true}},hero:{name:'Тестовый путешественник',species:'crystal',color:'#f2c19e',accessory:'none',dance:0}};
const original=JSON.stringify({version:'0.21.0',credits:777,story:6}),legacy=JSON.stringify(fixture);
try{
 for(const [engineName,engine] of [['chromium',chromium],['webkit',webkit]]){
  if(!(process.env.SPACEBAR_BROWSERS||'chromium,webkit').split(',').includes(engineName))continue;
  const browser=await engine.launch({headless:true,...(engineName==='chromium'?{...(existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium'}:{}),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']}: {})});
  try{
   const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[],heroes=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(({prefix,key,original,legacy})=>{
    const source=prefix?'spacebar-test-0212:spacebar-restored-v020':key;
    if(!localStorage.getItem(source))localStorage.setItem(source,legacy);
    if(prefix&&!localStorage.getItem('spacebar-restored-v020'))localStorage.setItem('spacebar-restored-v020',original);
    const native=HTMLCanvasElement.prototype.getContext,seen=new WeakSet();window.__heroContexts=0;
    HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl2'&&!seen.has(this)){seen.add(this);window.__heroContexts++}return native.call(this,type,...args)};
   },{prefix,key,original,legacy});
   await page.goto(url);const ready=()=>page.locator('#startup[hidden]').waitFor({state:'attached',timeout:30000});await ready();
   assert.equal(await page.evaluate(()=>window.spaceBarTest),undefined);
   const snap=()=>page.evaluate(()=>window.spaceBar.getSnapshot());
   assert.equal((await snap()).version,'0.21.3');assert.equal((await snap()).state.credits,321);assert.equal((await snap()).state.story,6);
   assert.equal((await snap()).heroModel.species,'crystal');
   const progress=s=>({credits:s.credits,story:s.story,inventory:s.inventory,quests:s.quests,jobs:s.jobs,relations:s.relations,met:s.met});
   const tap=async selector=>{const e=page.locator(selector);if(!selector.includes('species-'))await e.scrollIntoViewIfNeeded();assert.ok(await e.evaluate(el=>{const r=el.getBoundingClientRect();return r.height>=44&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===el}),selector);await e.tap()};
   const close=async()=>{if((await snap()).paused)await tap('#dialog-dismiss')};
   const menu=async action=>{await close();await tap('#menu');await tap('[data-action="'+action+'"]')};
   const preview=async(id,minHeight=100)=>{
    const canvas=page.locator('#hero-preview');
    const image=await canvas.evaluate(c=>{
     const ctx=c.getContext('2d'),d=ctx.getImageData(0,0,c.width,c.height).data,mask=[];let pixels=0,minY=c.height,maxY=0;
     for(let i=0;i<d.length;i+=4){const on=Math.abs(d[i]-d[0])+Math.abs(d[i+1]-d[1])+Math.abs(d[i+2]-d[2])>20;mask.push(on?1:0);if(on){pixels++;minY=Math.min(minY,Math.floor(i/4/c.width));maxY=Math.max(maxY,Math.floor(i/4/c.width))}}
     const r=c.getBoundingClientRect(),body=c.closest('.modal-body').getBoundingClientRect();
     return {species:c.dataset.species,signature:c.dataset.geometry,pixels,mask,visibleWithoutTestScroll:r.top>=body.top-1&&r.bottom<=body.bottom+1,shownHeight:(maxY-minY+1)/c.height*r.height};
    });
    assert.equal(image.species,id);assert.equal(image.signature,(await snap()).heroModel.signature);assert.ok(image.pixels>1000);assert.ok(image.visibleWithoutTestScroll,'preview is already visible without test scroll');assert.ok(image.shownHeight>minHeight,'visible mobile preview '+id);
    image.maskHash=createHash('sha256').update(Buffer.from(image.mask)).digest('hex');delete image.mask;return image;
   };
   const cdp=engineName==='chromium'?await page.context().newCDPSession(page):null;
   let held=false;
   const axes=async(side,forward)=>{
    const r=await page.locator('#joystick').boundingBox(),point={x:r.x+r.width/2+side*35,y:r.y+r.height/2+forward*35};
    if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:held?'touchMove':'touchStart',touchPoints:[{...point,id:1}]});
    else{await page.mouse.move(point.x,point.y);if(!held)await page.mouse.down()}
    held=true;
   };
   const release=async()=>{if(!held)return;if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.mouse.up();held=false};
   const walk=async(x,z)=>{
    for(let i=0;i<220;i++){
     const s=await snap(),dx=x-s.player.x,dz=z-s.player.z,len=Math.hypot(dx,dz);if(len<.22){await release();return}
     const yaw=s.camera.yaw,speed=Math.min(.9,len*1.5);await axes((dx*Math.cos(yaw)-dz*Math.sin(yaw))/len*speed,(dx*Math.sin(yaw)+dz*Math.cos(yaw))/len*speed);await page.waitForTimeout(90);
    }
    await release();throw Error('Could not walk to '+x+','+z);
   };
   const shot=async(name)=>{const file=engineName+'-'+name+'.png';await page.screenshot({path:resolve(output,file)});return file};
   for(const [index,id] of ids.entries()){
    await menu('appearance');const before=await snap();await tap('[data-action="species-'+id+'"]');
    const model=(await snap()).heroModel;assert.equal((await snap()).avatar.avatarBuildStatus,'ready');assert.equal((await snap()).avatar.renderedSpecies,id);assert.ok((await snap()).avatar.avatarFrame.pixels>300,'avatar contributes visible pixels to the real main framebuffer');assert.equal(model.species,id);assert.equal(model.modelCount,1);assert.equal((await snap()).state.hero.species,id);assert.deepEqual(progress((await snap()).state),progress(before.state));
    assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).hero.species,key),id);
    const image=await preview(id),editor=await shot(id+'-editor'),modelImage=engineName+'-'+id+'-model.png';
    await page.locator('#hero-preview').screenshot({path:resolve(output,modelImage)});await close();
    assert.equal((await snap()).world.overview,false);assert.equal((await snap()).heroModel.visible,true);
    await page.waitForTimeout(500);const third=await shot(id+'-third-person');
    const idle=(await snap()).heroModel.pose;await axes(.7,0);await page.waitForTimeout(240);const walking=(await snap()).heroModel.pose;
    assert.notDeepEqual(walking['leg-left'].rotation,idle['leg-left'].rotation);const walkingShot=await shot(id+'-walking');await release();
    await walk(0,2.8);await tap('#dance');assert.equal((await snap()).dancing,true);await page.waitForTimeout(180);
    const dancing=(await snap()).heroModel.pose;assert.notDeepEqual(dancing['arm-left'].rotation,idle['arm-left'].rotation);
    const dance=await shot(id+'-dance');await tap('#dance');
    await walk(-2.3,-3.3);assert.match((await snap()).interaction,/Сесть/);await tap('#interact');const seat=(await snap()).seated;assert.ok(seat);
    await menu('appearance');await tap('[data-action="species-'+ids[(index+1)%ids.length]+'"]');await tap('[data-action="species-'+id+'"]');await close();
    assert.equal((await snap()).seated,seat);assert.equal((await snap()).heroModel.signature,model.signature);const seated=await shot(id+'-seated');
    await tap('#camera');await page.waitForTimeout(120);const first=await snap();assert.equal(first.firstPerson,true);assert.equal(first.heroModel.visible,false);
    assert.ok(Math.abs(first.camera.height-(first.player.y+first.heroModel.eyeHeight*(first.seated?.78:1)))<.1,'camera follows the selected species eye height');
    await menu('appearance');await tap('[data-action="species-'+ids[(index+1)%ids.length]+'"]');await tap('[data-action="species-'+id+'"]');await preview(id);
    assert.equal((await snap()).firstPerson,true);const firstPerson=await shot(id+'-first-person-editor');await close();await tap('#camera');
    assert.equal((await snap()).heroModel.visible,true);assert.equal((await snap()).heroModel.signature,model.signature);
    await tap('#interact');assert.equal((await snap()).seated,null);
    await menu('residents');await tap('[data-action="approach-borks"]');
    await page.waitForFunction(()=>{const s=window.spaceBar.getSnapshot();return !s.navigation&&s.selectedNpc==='borks'&&s.flow.flow.code==='READY_TO_TALK'},undefined,{timeout:60000});
    await tap('#interact');assert.match(await page.locator('#dialog-title').innerText(),/Боркс/);const interaction=await shot(id+'-interaction');await close();
    await menu('map');await tap('[data-action="travel-rust"]');await page.waitForFunction(()=>window.spaceBar.getSnapshot().world.renderedLocation==='rust');
    await tap('#camera');await tap('#camera');await menu('world-status');const travelReport=JSON.parse(await page.locator('textarea[aria-label="Диагностический отчёт"]').inputValue());
    assert.equal(travelReport.renderedSpecies,id);assert.equal(travelReport.avatarGeometrySignature,model.signature);assert.ok(travelReport.avatarFrame.pixels>300,'visible after travel');await close();const travel=await shot(id+'-after-travel');
    await menu('map');await tap('[data-action="travel-nebula"]');await page.waitForFunction(()=>window.spaceBar.getSnapshot().world.renderedLocation==='nebula');
    const beforeReload=progress((await snap()).state);await page.reload();await ready();const restored=await snap();
    assert.equal(restored.state.hero.species,id);assert.equal(restored.heroModel.signature,model.signature);assert.deepEqual(progress(restored.state),beforeReload);
    assert.equal(await page.evaluate(()=>window.__heroContexts),1);
    heroes.push({id,name:names[index],geometry:model,preview:image,modelImage,editor,third,walking:walkingShot,dance,seated,firstPerson,interaction,travel,persisted:true});
    console.log(engineName+': '+id+' real preview, walking/dance/seat/interaction, camera modes and reload passed');
   }
   const sequence=[];
   for(const id of ['human','orbion','ribbon','crystal','orbion','mycelian','ribbon']){
    await menu('appearance');const before=await snap();await tap('[data-action="species-'+id+'"]');await close();const after=await snap();
    assert.equal(after.state.hero.species,id);assert.equal(after.avatar.renderedSpecies,id);assert.equal(after.avatar.avatarModelCount,1);assert.ok(after.avatar.avatarFrame.pixels>300);
    assert.equal(after.player.x,before.player.x);assert.equal(after.player.z,before.player.z);assert.deepEqual(progress(after.state),progress(before.state));sequence.push({id,geometry:after.avatar.avatarGeometrySignature,frame:after.avatar.avatarFrame});
   }
   assert.equal(new Set(heroes.map(h=>h.geometry.signature)).size,5);assert.equal(new Set(heroes.map(h=>h.preview.maskHash)).size,5);
   await menu('appearance');const stable=await snap();
   await page.evaluate(()=>{
    const p=WebGL2RenderingContext.prototype,native=p.drawElements;
    p.drawElements=function(...args){if(this.getParameter(this.FRAMEBUFFER_BINDING)!==null){p.drawElements=native;throw Error('Injected hero preview draw failure')}return native.apply(this,args)};
   });
   await tap('[data-action="species-human"]');
   const failed=await snap();assert.equal(failed.state.hero.species,stable.state.hero.species);assert.equal(failed.heroModel.signature,stable.heroModel.signature);assert.equal(failed.heroModel.revision,stable.heroModel.revision);
   assert.match(await page.locator('[data-notice]').innerText(),/Прежний вид/);
   await tap('[data-action="species-human"]');assert.equal((await snap()).heroModel.species,'human');await close();
   await menu('appearance');const beforeMainFailure=await snap();
   await page.evaluate(()=>{document.addEventListener('click',function arm(e){if(e.target.closest('[data-action="species-orbion"]')){document.removeEventListener('click',arm,true);const p=WebGL2RenderingContext.prototype,native=p.drawElements;p.drawElements=function(...args){if(this.getParameter(this.FRAMEBUFFER_BINDING)===null){p.drawElements=native;throw Error('Injected main-scene draw failure')}return native.apply(this,args)}}},true)});
   await tap('[data-action="species-orbion"]');const mainFailure=await snap();
   assert.equal(mainFailure.state.hero.species,beforeMainFailure.state.hero.species);assert.equal(mainFailure.heroModel.signature,beforeMainFailure.heroModel.signature);assert.equal(mainFailure.heroModel.revision,beforeMainFailure.heroModel.revision);
   assert.equal(mainFailure.avatar.avatarBuildStatus,'failed');assert.equal(mainFailure.avatar.lastAvatarError.stage,'main-scene');assert.match(await page.locator('[data-notice]').innerText(),/Прежний вид/);
   await tap('[data-action="species-orbion"]');assert.equal((await snap()).avatar.renderedSpecies,'orbion');await close();
   for(const viewport of [{width:320,height:568},{width:568,height:320}]){
    await page.setViewportSize(viewport);await menu('appearance');await tap('[data-action="species-ribbon"]');await preview('ribbon',45);
    await shot('layout-'+viewport.width+'x'+viewport.height);
    if(viewport.height<500){
     await page.evaluate(()=>{const p=WebGL2RenderingContext.prototype,native=p.drawElements;p.drawElements=function(...args){if(this.getParameter(this.FRAMEBUFFER_BINDING)!==null){p.drawElements=native;throw Error('Landscape preview failure')}return native.apply(this,args)}});
     await tap('[data-action="species-orbion"]');
     const notice=await page.locator('[data-notice]').evaluate(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e),b=e.closest('.modal-body').getBoundingClientRect();return {width:r.width,height:r.height,clip:s.clipPath,visible:r.top>=b.top-1&&r.bottom<=b.bottom+1}});
     assert.ok(notice.width>100&&notice.height>40&&notice.clip==='none'&&notice.visible,'landscape error remains readable');
     await shot('landscape-error');await tap('[data-action="species-orbion"]');assert.equal((await snap()).avatar.avatarBuildStatus,'ready');
    }
    await close();
   }
   if(prefix){
    assert.equal(await page.evaluate(()=>localStorage.getItem('spacebar-test-0212:spacebar-restored-v020')),legacy);
    assert.equal(await page.evaluate(()=>localStorage.getItem('spacebar-restored-v020')),original);
   }
   assert.deepEqual(errors,[]);reports.push({engine:engineName,url,version:'0.21.3',build:(await snap()).flow.build,physicalIPhoneTested:false,heroes,sequence,mainFramebufferRollback:true,oneWebGLContext:true,failureRollback:true,progressPreserved:true,legacyTestSaveCopied:!!prefix,errors});
   if(cdp)await cdp.detach();
   console.log('PASS '+engineName+': 5 actual hero geometries and mobile previews; no DEV positioning/camera; all poses, save and GPU-failure rollback');
  }finally{await browser.close()}
 }
 await writeFile(resolve(output,'results.json'),JSON.stringify({testedAt:new Date().toISOString(),reports},null,2)+'\n');
 const columns=['modelImage','editor','third','walking','dance','seated','firstPerson','interaction','travel'];
 const html='<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Space Bar RPG 0.21.3 — герой</title><style>body{font:16px system-ui;background:#17142b;color:#eee;padding:16px}section{display:flex;gap:12px;overflow:auto}img{width:230px}article{min-width:230px}code{word-break:break-all}</style><h1>0.21.3 — реальные снимки выбора героя</h1><p>Настоящие touch-кнопки production UI; камера не подменяется тестовым кодом. WebKit на Linux, физический iPhone не подключён.</p>'+reports.map(r=>'<h2>'+r.engine+'</h2>'+r.heroes.map(h=>'<h3>'+h.name+' · геометрия '+h.geometry.signature+'</h3><p>Вершины: '+h.geometry.vertices+'; видимая высота примерки: '+Math.round(h.preview.shownHeight)+' px. Перезагрузка: OK.</p><section>'+columns.map(c=>'<article><img src="'+h[c]+'"><p>'+c+'</p></article>').join('')+'</section>').join('')).join('')+'<p><a href="results.json">JSON результатов</a></p>';
 await writeFile(resolve(output,'index.html'),html);
}finally{if(host)await host.close()}
