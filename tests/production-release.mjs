import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {mkdtemp,mkdir,writeFile,symlink,unlink,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {servePages,pagesBase} from './pages-server.mjs';
import {verifyCandidate} from '../scripts/production-pages.mjs';

const candidate=resolve(process.env.SPACEBAR_PAGES_FOLDER||'production-site');await verifyCandidate(candidate);
const temp=await mkdtemp(resolve(tmpdir(),'spacebar-production-')),old=resolve(temp,'old'),active=resolve(temp,'active');
await mkdir(old);execFileSync('tar',['-xzf','hosting/production-0.21.0.tar.gz','-C',old]);await symlink(candidate,active);
const host=await servePages({folder:active}),out=resolve('test-results/production-release');await mkdir(out,{recursive:true});const reports=[];
const key='spacebar-restored-v020',backup='spacebar-restored-v020-backup-before-0211';
const fixtures=['0.20.0','0.21.0','0.21.2','0.21.3'].map(version=>({schema:2,version,credits:543,story:6,travelUnlocked:true,venue:'nebula',visited:['nebula','echo'],inventory:['station-pass','kept-item'],decisions:['docks:open','kept-decision'],quests:{party:'done',syrup:'done'},jobs:{coil:{status:'done',progress:1}},met:['zip'],relations:{zip:{points:7,greetDay:0,treatDay:0,gift:true}},hero:{name:'Основной прогресс',species:'orbion',color:'#f2c19e',accessory:'none',dance:0}}));
const progress=s=>({credits:s.credits,story:s.story,hero:s.hero,quests:s.quests,jobs:{coil:s.jobs.coil},relations:s.relations,inventory:s.inventory,decisions:s.decisions,met:s.met,venue:s.venue,visited:s.visited});
try{
 for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
  if(!(process.env.SPACEBAR_BROWSERS||'chromium,webkit').split(',').includes(name))continue;
  const browser=await engine.launch({headless:true,...(name==='chromium'?{...(existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium'}:{}),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']}: {})});
  try{for(const fixture of fixtures){
   const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(({fixture,key,backup})=>{if(!localStorage.getItem(key)){localStorage.setItem(key,JSON.stringify(fixture));localStorage.setItem(backup,'existing-backup-do-not-replace');for(const v of ['0211','0212','0213'])localStorage.setItem('spacebar-test-'+v+':'+key,'test-save-'+v)}},{fixture,key,backup});
   await page.goto(host.origin+pagesBase);const ready=()=>page.locator('#startup[hidden]').waitFor({state:'attached'});await ready();const snap=()=>page.evaluate(()=>window.spaceBar.getSnapshot());
   assert.equal((await snap()).version,'0.21.3');assert.deepEqual(progress((await snap()).state),progress(fixture));assert.equal((await snap()).avatar.renderedSpecies,'orbion');
   const tap=async s=>{await page.locator(s).scrollIntoViewIfNeeded();await page.locator(s).tap()};
   await tap('#menu');await tap('[data-action="appearance"]');await tap('[data-action="species-ribbon"]');await tap('#dialog-dismiss');assert.equal((await snap()).avatar.renderedSpecies,'ribbon');assert.ok((await snap()).avatar.avatarFrame.pixels>300);
   await tap('#menu');await tap('[data-action="map"]');await tap('[data-action="travel-rust"]');await page.waitForFunction(()=>window.spaceBar.getSnapshot().world.renderedLocation==='rust');
   await tap('#menu');await tap('[data-action="save"]');await tap('#dialog-dismiss');const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);assert.equal(saved.hero.species,'ribbon');assert.equal(saved.venue,'rust');
   await page.reload();await ready();assert.deepEqual(progress((await snap()).state),progress(saved));assert.equal((await snap()).avatar.renderedSpecies,'ribbon');
   await page.screenshot({path:resolve(out,name+'-'+fixture.version+'-upgrade.png')});
   // Same origin, path, browser storage and real 0.21.0 published files: rollback must not reset progress.
   await unlink(active);await symlink(old,active);await page.reload();await ready();
   await page.waitForTimeout(2300);const rolled=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);assert.equal(rolled.version,'0.21.0');assert.deepEqual(progress(rolled),progress(saved));
   await page.screenshot({path:resolve(out,name+'-'+fixture.version+'-rollback.png')});
   await unlink(active);await symlink(candidate,active);await page.reload();await ready();assert.deepEqual(progress((await snap()).state),progress(saved));assert.equal((await snap()).avatar.renderedSpecies,'ribbon');
   const storage=await page.evaluate(()=>({...localStorage}));assert.equal(storage[backup],'existing-backup-do-not-replace');for(const v of ['0211','0212','0213'])assert.equal(storage['spacebar-test-'+v+':'+key],'test-save-'+v);assert.deepEqual(errors,[]);
   reports.push({engine:name,sourceVersion:fixture.version,mainSaveKey:key,upgrade:true,avatarChanged:true,travel:true,reload:true,rollback0210:true,reupgrade:true,backupAndTestSavesUnchanged:true,errors});console.log('PASS production '+name+' '+fixture.version+': upgrade, avatar, travel, reload, real 0.21.0 rollback, reupgrade');await context.close();
  }}finally{await browser.close()}
 }
 await writeFile(resolve(out,'results.json'),JSON.stringify({reports,physicalProductionIPhonePending:true},null,2)+'\n');
}finally{await host.close();await rm(temp,{recursive:true,force:true})}
