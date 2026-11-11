import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {cp,mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {resolve,relative,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const manifest=JSON.parse(await readFile(resolve(root,'hosting/published-before-0213.json'),'utf8'));
const version='0.21.3',previewPath='test/'+version+'/',prefix='spacebar-test-0213:';
const digest=data=>createHash('sha256').update(data).digest('hex');
async function readURL(url,options){
 const response=await fetch(url,{...options,signal:AbortSignal.timeout(25000)});
 assert.equal(response.status,200,url);return Buffer.from(await response.arrayBuffer());
}
async function checkProduction(){
 for(const [name,hash] of Object.entries(manifest.files))assert.equal(digest(await readURL(manifest.url+name)),hash,'Published production changed: '+name);
 console.log('Existing 0.21.0, 0.21.1 and 0.21.2 preserved: all '+Object.keys(manifest.files).length+' published file hashes match');
}
async function guardMain(){
 const headers={Accept:'application/vnd.github+json'};
 if(process.env.GH_TOKEN)headers.Authorization='Bearer '+process.env.GH_TOKEN;
 const ref=JSON.parse((await readURL('https://api.github.com/repos/64zszfrgmd-afk/Space-bar-rpg/git/ref/heads/main',{headers})).toString());
 assert.equal(ref.object.sha,manifest.mainCommit,'main changed; preserve its new deployed artifact first');
 await checkProduction();
}
async function fileHashes(folder){
 const result={};
 async function walk(path){
  for(const entry of await readdir(path,{withFileTypes:true})){
   const file=resolve(path,entry.name);
   if(entry.isDirectory())await walk(file);
   else{assert.ok(entry.isFile(),'Only regular static files');result[relative(folder,file).split('\\').join('/')]=digest(await readFile(file))}
  }
 }
 await walk(folder);return result;
}
async function assemble(){
 const archive=resolve(root,'hosting',manifest.archiveFile),site=resolve(root,'pages-preview-0213');
 assert.ok(!existsSync(site),'Use a fresh staging directory; existing files are never removed');
 await mkdir(site);
 if(existsSync(archive)){
  assert.equal(digest(await readFile(archive)),manifest.archiveSha256);
  for(const entry of execFileSync('tar',['-tzf',archive],{encoding:'utf8'}).trim().split('\n')){
   const name=entry.replace(/^\.\//,'').replace(/\/$/,'');assert.ok(!name.startsWith('/')&&!name.split('/').includes('..'),name);
  }
  execFileSync('tar',['-xzf',archive,'--no-same-owner','--no-same-permissions','--directory',site]);
 }else{
  // The live versions are immutable inputs pinned by 106 SHA-256 values. Do not
  // silently substitute any file if the published site has changed.
  for(const [name,hash] of Object.entries(manifest.files)){
   assert.ok(!name.startsWith('/')&&!name.split('/').includes('..'),name);
   const data=await readURL(manifest.url+name);assert.equal(digest(data),hash,name);
   const target=resolve(site,name);await mkdir(dirname(target),{recursive:true});await writeFile(target,data);
  }
 }
 const original=await fileHashes(site);assert.deepEqual(original,manifest.files);
 const preview=resolve(root,'preview-dist-0213');
 assert.equal(JSON.parse(await readFile(resolve(preview,'version.json'),'utf8')).version,version);
 const target=resolve(site,previewPath);await mkdir(resolve(site,'test'),{recursive:true});
 await cp(preview,target,{recursive:true,errorOnExist:true,force:false});
 const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
 // Copy the old test save once. The old namespace and the main game stay untouched.
 // No save schema or in-game storage implementation is changed.
 const bootstrap="try{const target='spacebar-test-0213:spacebar-restored-v020';if(localStorage.getItem(target)===null){const raw=localStorage.getItem('spacebar-test-0212:spacebar-restored-v020');if(raw){const value=JSON.parse(raw);if(typeof value.credits==='number'&&Number.isFinite(value.credits)&&value.credits>=0)localStorage.setItem(target,raw)}}}catch{}";
 const index=resolve(target,'index.html'),html=await readFile(index,'utf8');assert.ok(html.includes('<head>'));
 await writeFile(index,html.replace('<head>','<head><script>'+bootstrap+'</script>'));
 const metadata={version,sourceCommit:commit,sourceBranch:'feature/v0.21.3-avatar-fixes',
  base:'/Space-bar-rpg/'+previewPath,savePrefix:prefix,copySaveFrom:'spacebar-test-0212:',productionCommit:manifest.mainCommit};
 await writeFile(resolve(target,'preview-build.json'),JSON.stringify(metadata,null,2)+'\n');
 for(const [name,hash] of Object.entries(manifest.files))assert.equal(digest(await readFile(resolve(site,name))),hash,name);
 console.log('Staged original production plus '+previewPath+' at '+commit);
}
async function publishReport(){
 const target=resolve(root,'pages-preview-0213',previewPath,'hero-report');
 await cp(resolve(root,'test-results/hero-appearance/staged'),target,{recursive:true,errorOnExist:true,force:false});
 await cp(resolve(root,'test-results/avatar-comparison'),resolve(target,'comparisons'),{recursive:true,errorOnExist:true,force:false});
 const reportIndex=resolve(target,'index.html');await writeFile(reportIndex,(await readFile(reportIndex,'utf8'))+'<p><a href="comparisons/">Сравнить пять видов с одинаковой камерой, масштабом и светом</a></p>');
 console.log('WebKit and Chromium screenshots added to '+previewPath+'hero-report/');
}
async function verifyPublished(){
 await checkProduction();
 const files=await fileHashes(resolve(root,'pages-preview-0213'));
 for(let attempt=0;attempt<12;attempt++){
  try{
   for(const [name,hash] of Object.entries(files))assert.equal(digest(await readURL(manifest.url+name)),hash,name);
   break;
  }catch(error){if(attempt===11)throw error;await new Promise(r=>setTimeout(r,5000))}
 }
 const output=resolve(root,'test-results/pages-preview');await mkdir(output,{recursive:true});
 await writeFile(resolve(output,'published-files.json'),JSON.stringify(files,null,2)+'\n');
 console.log('HTTPS publication verified: '+Object.keys(files).length+' exact files');
}
const actions={'check-production':checkProduction,'guard-main':guardMain,assemble,'publish-report':publishReport,'verify-published':verifyPublished};
assert.ok(Object.hasOwn(actions,process.argv[2]),'Expected check-production, guard-main, assemble, publish-report or verify-published');
await actions[process.argv[2]]();
