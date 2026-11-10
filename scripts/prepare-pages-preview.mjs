import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {cp,mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const manifest=JSON.parse(await readFile(resolve(root,'hosting/production-0.21.0.json'),'utf8'));
const previewPath='test/0.21.1/',prefix='spacebar-test-0211:';
const digest=data=>createHash('sha256').update(data).digest('hex');
async function readURL(url,options){
 const response=await fetch(url,{...options,signal:AbortSignal.timeout(25000)});
 assert.equal(response.status,200,url);return Buffer.from(await response.arrayBuffer());
}
async function checkProduction(){
 for(const [name,hash] of Object.entries(manifest.files))assert.equal(digest(await readURL(manifest.url+name)),hash,'Published production changed: '+name);
 console.log('Production unchanged: all six deployed file hashes match 0.21.0');
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
 const archive=resolve(root,'hosting/production-0.21.0.tar.gz'),site=resolve(root,'pages-preview');
 assert.equal(digest(await readFile(archive)),manifest.archiveSha256);
 assert.ok(!existsSync(site),'Use a fresh staging directory; existing files are never removed');
 // The archived tar was checked against the live site before it was committed.
 // Check its file list again before extraction; its exact SHA is pinned above.
 for(const entry of execFileSync('tar',['-tzf',archive],{encoding:'utf8'}).trim().split('\n')){
  const name=entry.replace(/^\.\//,'').replace(/\/$/,'');
  assert.ok(!name.startsWith('/')&&!name.split('/').includes('..'),name);
 }
 await mkdir(site);
 execFileSync('tar',['-xzf',archive,'--no-same-owner','--no-same-permissions','--directory',site]);
 const original=await fileHashes(site);assert.deepEqual(original,manifest.files);
 const preview=resolve(root,'preview-dist');
 assert.equal(JSON.parse(await readFile(resolve(preview,'version.json'),'utf8')).version,'0.21.1');
 const target=resolve(site,previewPath);await mkdir(resolve(site,'test'),{recursive:true});
 await cp(preview,target,{recursive:true,errorOnExist:true,force:false});
 const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
 const metadata={version:'0.21.1',sourceCommit:commit,sourceBranch:'feature/v0.21-world-fixes',
  base:'/Space-bar-rpg/'+previewPath,savePrefix:prefix,productionCommit:manifest.mainCommit};
 await writeFile(resolve(target,'preview-build.json'),JSON.stringify(metadata,null,2)+'\n');
 for(const [name,hash] of Object.entries(manifest.files))assert.equal(digest(await readFile(resolve(site,name))),hash,name);
 console.log('Staged original production plus '+previewPath+' at '+commit);
}
async function verifyPublished(){
 await checkProduction();
 const files=await fileHashes(resolve(root,'pages-preview'));
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
const actions={'check-production':checkProduction,'guard-main':guardMain,assemble,'verify-published':verifyPublished};
assert.ok(Object.hasOwn(actions,process.argv[2]),'Expected check-production, guard-main, assemble or verify-published');
await actions[process.argv[2]]();
