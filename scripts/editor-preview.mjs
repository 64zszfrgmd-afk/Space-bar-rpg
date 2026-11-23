import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {mkdir,readFile,writeFile,cp} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {baseline,hash,hashes,download,safeName} from './production-pages.mjs';

const site='editor-pages',path='test/hero-editor-tabs/',prefix='spacebar-test-hero-editor:',out='test-results/editor-preview';
const manifestPath=path+'published-files.json',head=()=>process.env.EDITOR_SOURCE_HEAD||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
async function assertFrozen(){const staged=await hashes(site);for(const [name,digest] of Object.entries(baseline.files))assert.equal(staged[name],digest,'Existing published version changed: '+name)}
async function assemble(){
 assert.ok(!existsSync(site),'Use a fresh preview directory');await mkdir(out,{recursive:true});
 assert.deepEqual(await hashes('production-backup'),baseline.files);await cp('production-backup',site,{recursive:true});
 const before={...baseline.files},response=await fetch(baseline.url+manifestPath,{signal:AbortSignal.timeout(25000)});
 if(response.status!==404){
  assert.equal(response.status,200);const bytes=Buffer.from(await response.arrayBuffer()),previous=JSON.parse(bytes);
  for(const [name,digest] of Object.entries(baseline.files))assert.equal(previous.files[name],digest,'A newer production baseline must be captured before publication');
  for(const [name,digest] of Object.entries(previous.files))if(name.startsWith(path)){
   safeName(name);const data=await download(baseline.url+name);assert.equal(hash(data),digest,name);before[name]=digest;const file=resolve(site,name);await mkdir(dirname(file),{recursive:true});await writeFile(file,data);
  }
  before[manifestPath]=hash(bytes);
 }
 await writeFile(resolve(out,'before.json'),JSON.stringify(before,null,2)+'\n');
 const target=resolve(site,path);await mkdir(target,{recursive:true});await cp('editor-dist',target,{recursive:true});
 const index=resolve(target,'index.html'),html=await readFile(index,'utf8');assert.ok(html.includes('<head>'));
 const bootstrap="try{const key='spacebar-test-hero-editor:spacebar-restored-v020';if(localStorage.getItem(key)===null){const raw=localStorage.getItem('spacebar-test-0213:spacebar-restored-v020');if(raw){const s=JSON.parse(raw);if(typeof s.credits==='number'&&Number.isFinite(s.credits)&&s.credits>=0)localStorage.setItem(key,raw)}}}catch{}";
 await writeFile(index,html.replace('<head>','<head><script>'+bootstrap+'</script>'));
 await writeFile(resolve(target,'preview-build.json'),JSON.stringify({version:'0.21.3',feature:'hero-editor-tabs',editorRevision:'tabs-1',sourceHead:head(),base:'/Space-bar-rpg/'+path,savePrefix:prefix,copySaveFrom:'spacebar-test-0213:',mainCommit:baseline.mainCommit},null,2)+'\n');
 assert.equal(JSON.parse(await readFile(resolve(target,'version.json'),'utf8')).version,'0.21.3');
 await assertFrozen();console.log('Staged isolated editor preview; all 233 previously published files unchanged');
}
async function report(){
 const target=resolve(site,path,'editor-report');await mkdir(target,{recursive:true});
 for(const browser of ['chromium','webkit'])await cp(resolve('editor-evidence','editor-'+browser+'-hero','editor-tabs','staged'),resolve(target,browser),{recursive:true});
 await writeFile(resolve(target,'index.html'),'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Редактор героя — проверки</title><h1>Три вкладки и 15 танцев</h1><p>Автоматические снимки основной сцены и мобильного интерфейса. Физический iPhone требует проверки владельцем.</p><p><a href="chromium/">Chromium</a> · <a href="webkit/">WebKit</a></p>');
 await assertFrozen();const files=await hashes(site);delete files[manifestPath];await writeFile(resolve(site,manifestPath),JSON.stringify({sourceHead:head(),files},null,2)+'\n');
 await writeFile(resolve(out,'expected.json'),JSON.stringify(await hashes(site),null,2)+'\n');
}
async function api(path){const r=await fetch('https://api.github.com/repos/64zszfrgmd-afk/Space-bar-rpg/'+path,{headers:process.env.GH_TOKEN?{Authorization:'Bearer '+process.env.GH_TOKEN}:{},signal:AbortSignal.timeout(25000)});assert.equal(r.status,200);return r.json()}
async function guard(){
 assert.equal((await api('branches/main')).commit.sha,baseline.mainCommit,'main changed; do not replace the newer production site');
 assert.equal((await api('branches/feature%2Fhero-editor-tabs')).commit.sha,head(),'A newer editor commit exists');
 const before=JSON.parse(await readFile(resolve(out,'before.json'),'utf8'));for(const [name,digest] of Object.entries(before))assert.equal(hash(await download(baseline.url+name)),digest,'A newer deployment exists: '+name);
 await assertFrozen();console.log('Publication guard passed: current main, branch and every prior published file match');
}
async function verify(){
 const expected=JSON.parse(await readFile(resolve(out,'expected.json'),'utf8'));
 for(let attempt=0;attempt<12;attempt++){
  try{for(const [name,digest] of Object.entries(expected))assert.equal(hash(await download(baseline.url+name)),digest,name);console.log('HTTPS verified, including all 233 unchanged original files');return}
  catch(error){if(attempt===11)throw error;await new Promise(r=>setTimeout(r,5000))}
 }
}
const commands={assemble,report,guard,verify};assert.ok(Object.hasOwn(commands,process.argv[2]));await commands[process.argv[2]]();
