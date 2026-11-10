import {chromium,webkit} from 'playwright';
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {servePages,pagesBase} from './pages-server.mjs';
const out=new URL('../test-results/world-visual/',import.meta.url);await mkdir(out,{recursive:true});
const host=await servePages(),dev=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5178','--strictPort'],{stdio:'pipe'});
let devLog='';dev.stdout.on('data',d=>devLog+=d);dev.stderr.on('data',d=>devLog+=d);
const devURL='http://127.0.0.1:5178'+pagesBase;
for(let i=0;i<100;i++){try{if((await fetch(devURL)).ok)break}catch{}if(i===99)throw Error(devLog);await new Promise(r=>setTimeout(r,100))}
const ids=['nebula','meridian','rust','comet','plankton','abyss','orbit','echo','cabin'],reports=[];
const fixture={schema:2,version:'0.20.0',credits:255,energy:42,mood:82,buzz:17,story:6,venue:'nebula',visited:['nebula'],inventory:['station-pass'],decisions:['docks:open','pass:physical'],met:['zip','zora'],relations:{zip:{points:7,greetDay:0,treatDay:-1,gift:false}},quests:{party:'done',syrup:'done'},partyDance:15,syrupStage:2,jobs:{coil:{status:'done',progress:1}}};
const imageData=async(name,data)=>{await writeFile(new URL(name,out),Buffer.from(data.split(',')[1],'base64'));return name};
async function captureProduction(page){return page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>{const canvas=document.querySelector('#scene canvas');resolve(canvas.toDataURL())})))}
async function menu(page,action){if(!await page.locator('#dialog').evaluate(n=>n.classList.contains('hidden')))await page.keyboard.press('Escape');await page.locator('#menu').tap();await page.locator('[data-action="'+action+'"]').tap()}
async function go(page,id){await menu(page,'map');await page.locator('[data-action="travel-'+id+'"]').tap();await page.waitForFunction(id=>window.spaceBar.getSnapshot().world.renderedLocation===id,id);await page.waitForTimeout(80)}
try{
 for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
  if(!(process.env.SPACEBAR_BROWSERS||'chromium,webkit').split(',').includes(name))continue;
  const executablePath=name==='chromium'?(process.env.SPACEBAR_CHROMIUM||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined)):undefined;
  const browser=await engine.launch({headless:true,...(executablePath?{executablePath}:{}),...(name==='chromium'?{args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']}: {})});
  const report={engine:name,physicalIPhoneTested:false,production:[],rooms:[],npcs:[],heroes:[],errors:[]};
  try{
   const prod=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});prod.on('pageerror',e=>report.errors.push(e.message));await prod.addInitScript(f=>{if(!localStorage.getItem('spacebar-restored-v020'))localStorage.setItem('spacebar-restored-v020',JSON.stringify(f))},fixture);
   await prod.goto(host.origin+pagesBase);await prod.locator('#startup[hidden]').waitFor({state:'attached'});assert.equal(await prod.evaluate(()=>window.spaceBarTest),undefined);
   for(const id of ids){await go(prod,id);const s=await prod.evaluate(()=>window.spaceBar.getSnapshot());assert.equal(s.world.location,id);assert.equal(s.world.status,'ready');assert.equal(s.state.credits,255);assert.equal(s.state.quests.syrup,'done');assert.equal(s.state.jobs.coil.status,'done');assert.ok(s.state.met.includes('zip'));assert.ok(s.state.decisions.includes('pass:physical'));await imageData(name+'-production-'+id+'.png',await captureProduction(prod));report.production.push({id,rendered:s.world.renderedLocation,npcs:s.world.visibleNpcIds});}
   await prod.reload();await prod.locator('#startup[hidden]').waitFor({state:'attached'});assert.equal(await prod.evaluate(()=>window.spaceBar.getSnapshot().state.venue),'cabin');assert.equal(await prod.evaluate(()=>window.spaceBar.getSnapshot().state.credits),255);await prod.close();
   const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});page.on('pageerror',e=>report.errors.push(e.message));await page.addInitScript(f=>{window.__SPACEBAR_TEST__=true;if(!localStorage.getItem('spacebar-restored-v020'))localStorage.setItem('spacebar-restored-v020',JSON.stringify(f))},fixture);await page.goto(devURL);await page.waitForFunction(()=>!!window.spaceBarTest);await page.locator('#startup[hidden]').waitFor({state:'attached'});
   // Pixel differences hide only the model, leaving name labels, light, camera and scenery unchanged.
   await page.evaluate(()=>{window.visualProbe=(kind,id,closeup=false)=>{
    const t=window.spaceBarTest,object=kind==='npc'?t.npcs.find(n=>n.id===id).mesh:kind==='hero'?t.player:t.router.current.group,c=t.camera;
    if(closeup){const n=kind==='npc'?t.npcs.find(n=>n.id===id):{x:t.player.position.x,z:t.player.position.z,mesh:t.player};const angle=n.mesh.rotation.y;c.fov=55;c.position.set(n.x+Math.sin(angle)*3,2.3,n.z+Math.cos(angle)*3);c.lookAt(n.x,1.3,n.z);c.updateProjectionMatrix()}
    const gl=t.renderer.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,read=()=>{t.renderer.render(t.scene,c);const bytes=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,bytes);return bytes};
    const a=read(),png=t.renderer.domElement.toDataURL(),was=object.visible;object.visible=false;const b=read();object.visible=was;read();let pixels=0;for(let i=0;i<a.length;i+=4)if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>15)pixels++;
    let meshes=0;const geometry=[];object.traverse(n=>{if(n.isMesh){meshes++;geometry.push([n.geometry.type,n.geometry.getAttribute('position')?.count,n.geometry.parameters,n.position.toArray(),n.rotation.toArray(),n.scale.toArray()])}});
    return {pixels,meshes,png,geometry:JSON.stringify(geometry)};
   }});
   for(const id of ids){
    await go(page,id);const room=await page.evaluate(()=>{const t=window.spaceBarTest;return {id:t.router.id,root:t.router.current.group.name,actors:t.npcs.map(n=>({id:n.id,name:n.name})),layers:[...t.actorLayers].filter(([,g])=>g.visible).map(([id])=>id)}});assert.equal(room.id,id);assert.equal(room.root,'venue-environment:'+id);assert.deepEqual(room.layers,[id]);
    const env=await page.evaluate(()=>window.visualProbe('room'));assert.ok(env.pixels>4000,id+' actual environment pixels');assert.ok(env.meshes>35,id+' populated room');const screenshot=await imageData(name+'-room-'+id+'.png',env.png);report.rooms.push({id,screenshot,environmentPixels:env.pixels,meshes:env.meshes,geometryHash:createHash('sha256').update(env.geometry).digest('hex')});
    for(const n of room.actors){
     const arrival=await page.evaluate(id=>window.visualProbe('npc',id),n.id);assert.ok(arrival.pixels>=8,n.id+' visible at arrival');
     await menu(page,'residents');await page.locator('[data-action="locate-'+n.id+'"]').tap();await page.waitForTimeout(1300);const located=await page.evaluate(id=>window.visualProbe('npc',id),n.id);assert.ok(located.pixels>8,n.id+' located in camera');
     const model=await page.evaluate(id=>window.visualProbe('npc',id,true),n.id);assert.ok(model.pixels>100,n.id+' actual closeup model');const shot=await imageData(name+'-npc-'+n.id+'.png',model.png);
     // Find an actually reachable interaction point from the arrival spawn, then open that NPC's real dialogue.
     const point=await page.evaluate(id=>{const t=window.spaceBarTest,step=.25,queue=[[0,-2]],seen=new Set(['0,-2']);let i=0;while(i<queue.length){const [x,z]=queue[i++];for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,key=nx+','+nz;if(!seen.has(key)&&t.canMove(nx*step,nz*step)){seen.add(key);queue.push([nx,nz])}}}const n=t.npcs.find(n=>n.id===id);return queue.map(([x,z])=>({x:x*step,z:z*step})).find(p=>{t.player.position.set(p.x,0,p.z);return window.spaceBar.getSnapshot().interaction==='Поговорить · '+n.name})},n.id);assert.ok(point,n.id+' reachable dialogue');
     await page.evaluate(p=>window.spaceBarTest.player.position.set(p.x,0,p.z),point);await page.keyboard.press('e');await page.getByRole('heading',{name:n.name,exact:true}).waitFor();assert.ok(await page.locator('#dialog button').count()>1);await page.keyboard.press('Escape');
     report.npcs.push({...n,venue:id,arrivalPixels:arrival.pixels,locatedPixels:located.pixels,modelPixels:model.pixels,meshes:model.meshes,screenshot:shot,dialogue:true});
     await go(page,id);
    }
   }
   console.log(name+': all 23 NPC render and dialogue checks passed');assert.equal(report.npcs.length,23);assert.equal(new Set(report.rooms.map(r=>r.geometryHash)).size,9,'nine distinct scene geometries');
   await go(page,'nebula');for(const id of ['human','crystal','mycelian','orbion','ribbon']){await menu(page,'appearance');await page.locator('[data-action="species-'+id+'"]').tap();await page.keyboard.press('Escape');const hero=await page.evaluate(()=>window.visualProbe('hero',null,true));assert.ok(hero.pixels>100,id+' rendered hero');assert.equal(await page.evaluate(()=>window.spaceBarTest.player.children.length),1);const screenshot=await imageData(name+'-hero-'+id+'.png',hero.png);report.heroes.push({id,pixels:hero.pixels,meshes:hero.meshes,geometryHash:createHash('sha256').update(hero.geometry).digest('hex'),screenshot})}
   assert.equal(new Set(report.heroes.map(h=>h.geometryHash)).size,5);
   const before=await page.evaluate(()=>window.spaceBar.getSnapshot());await page.evaluate(()=>{const t=window.spaceBarTest,build=t.router.build;t.router.build=()=>{throw Error('Injected scene load failure')};window.restoreWorldBuild=()=>{t.router.build=build}});await menu(page,'map');await page.locator('[data-action="travel-echo"]').tap();const failed=await page.evaluate(()=>window.spaceBar.getSnapshot());assert.equal(failed.state.venue,before.state.venue);assert.equal(failed.state.credits,before.state.credits);assert.equal(failed.world.renderedLocation,'nebula');assert.ok(failed.world.issues.some(i=>i.code==='LOCATION_LOAD_FAILED'));assert.match(await page.locator('#toast').innerText(),/Предыдущая локация сохранена/);await page.evaluate(()=>window.restoreWorldBuild());await go(page,'echo');report.loadFailureRollback=true;
   assert.deepEqual(report.errors,[]);await page.close();
   const broken=await browser.newPage(),startupErrors=[];broken.on('pageerror',error=>startupErrors.push(error.message));await broken.addInitScript(()=>{WebGL2RenderingContext.prototype.drawElements=function(){throw Error('Injected initial GPU draw failure')}});await broken.goto(host.origin+pagesBase);await broken.locator('#startup-retry:not([hidden])').waitFor({timeout:15000});assert.match(await broken.locator('#startup-message').innerText(),/Не удалось отрисовать 3D/);assert.deepEqual(startupErrors,[]);await broken.close();report.initialDrawFailureHandled=true;
   reports.push(report);await writeFile(new URL('results.json',out),JSON.stringify({version:'0.21.1',testedAt:new Date().toISOString(),reports},null,2)+'\n');console.log(`PASS ${name}: 9 rendered worlds, 23 pixel-visible NPCs and dialogues, 5 rendered heroes, production travel/save and failure rollback`);
   const tiles=(title,items,key)=>`<h2>${title}</h2><section>${items.map(v=>`<article><img src="${v.screenshot}"><p>${v.name||v.id} ${v.venue?'· '+v.venue:''}<br>${v[key]} pixels</p></article>`).join('')}</section>`;
   const html='<!doctype html><meta charset="UTF-8"><title>Space Bar 0.21.1 · '+name+'</title><style>body{font:16px system-ui;background:#15132b;color:#fff;padding:20px}section{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}article{background:#28233e;padding:8px}img{width:100%}h2{margin-top:32px}</style><h1>Space Bar RPG 0.21.1 · '+name+'</h1><p>Real WebGL screenshots. Models verified by framebuffer difference with their labels retained. Physical iPhone not tested.</p>'+tiles('9 locations',report.rooms,'environmentPixels')+tiles('23 NPCs',report.npcs,'modelPixels')+tiles('5 heroes',report.heroes,'pixels');await writeFile(new URL(name+'-report.html',out),html);
   const gallery=await browser.newPage({viewport:{width:1280,height:900}});await gallery.goto(devURL+'test-results/world-visual/'+name+'-report.html');await gallery.waitForFunction(()=>[...document.images].every(img=>img.complete&&img.naturalWidth>0));for(const [kind,index] of [['locations',0],['npcs',1],['heroes',2]])await gallery.locator('section').nth(index).screenshot({path:new URL(name+'-'+kind+'-contact-sheet.png',out).pathname});await gallery.close();
  }finally{await browser.close()}
 }
 await writeFile(new URL('results.json',out),JSON.stringify({testedAt:new Date().toISOString(),reports},null,2)+'\n');
}finally{dev.kill();await host.close()}
