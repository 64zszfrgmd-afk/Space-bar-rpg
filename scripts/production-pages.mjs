import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {mkdir,readFile,readdir,writeFile,cp} from 'node:fs/promises';
import {resolve,relative,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';

export const baseline=JSON.parse(await readFile(new URL('../hosting/production-before-0213.json',import.meta.url),'utf8'));
export const hash=data=>createHash('sha256').update(data).digest('hex');
export function safeName(name){assert.ok(name&&!name.startsWith('/')&&!name.includes('\\')&&!name.split('/').some(p=>!p||p==='.'||p==='..'),'Unsafe static file: '+name);return name}
export async function hashes(folder){
 const result={};
 async function walk(path){for(const e of await readdir(path,{withFileTypes:true})){const f=resolve(path,e.name);if(e.isDirectory())await walk(f);else{assert.ok(e.isFile(),'No symlinks in Pages artifact');result[relative(folder,f).split('\\').join('/')]=hash(await readFile(f))}}}
 await walk(resolve(folder));return result;
}
export async function download(url){
 for(let attempt=0;attempt<4;attempt++){
  try{const response=await fetch(url,{signal:AbortSignal.timeout(25000)});assert.equal(response.status,200,url);return Buffer.from(await response.arrayBuffer())}
  catch(error){if(attempt===3)throw error;await new Promise(r=>setTimeout(r,1000*(attempt+1)))}
 }
}
export async function snapshot(folder='production-backup'){
 assert.ok(!existsSync(folder),'Fresh backup directory required');await mkdir(folder,{recursive:true});
 const entries=Object.entries(baseline.files);let next=0;
 await Promise.all(Array.from({length:4},async()=>{while(next<entries.length){const [name,digest]=entries[next++];safeName(name);const bytes=await download(baseline.url+name);assert.equal(hash(bytes),digest,'Live baseline changed: '+name);const path=resolve(folder,name);await mkdir(dirname(path),{recursive:true});await writeFile(path,bytes)}}));
 assert.deepEqual(await hashes(folder),baseline.files);console.log('Verified backup: '+entries.length+' immutable published files');
}
export function checkPreserved(before,after){
 for(const [name,digest] of Object.entries(before))if(name.startsWith('test/')||name.startsWith('assets/'))assert.equal(after[name],digest,'Previously published file lost/changed: '+name);
}
export async function verifyCandidate(folder='production-site'){
 const files=await hashes(folder);checkPreserved(baseline.files,files);
 const meta=JSON.parse(await readFile(resolve(folder,'production-build.json'),'utf8'));
 assert.equal(meta.version,'0.21.3');assert.equal(meta.base,'/Space-bar-rpg/');assert.equal(meta.savePrefix,'');assert.equal(meta.saveKey,'spacebar-restored-v020');
 const html=await readFile(resolve(folder,'index.html'),'utf8');assert.ok(!html.includes('spacebar-test-'),'No test save bootstrap in production HTML');
 const assets=[...html.matchAll(/(?:src|href)="([^"]+\/assets\/[^\"]+)"/g)].map(m=>m[1]);assert.ok(assets.length>=3);
 for(const asset of assets){assert.ok(asset.startsWith('/Space-bar-rpg/assets/'),asset);assert.ok(files[asset.slice('/Space-bar-rpg/'.length)],asset)}
 const js=await Promise.all(assets.filter(a=>a.endsWith('.js')).map(a=>readFile(resolve(folder,a.slice('/Space-bar-rpg/'.length)),'utf8')));
 assert.ok(js.some(s=>s.includes('spacebar-restored-v020')));assert.ok(js.every(s=>!s.includes('spacebar-test-')),'Test namespace compiled into production');
 assert.equal(JSON.parse(await readFile(resolve(folder,'version.json'),'utf8')).version,'0.21.3');
 const manifest=JSON.parse(await readFile(resolve(folder,'production-files.json'),'utf8'));delete files['production-files.json'];assert.deepEqual(files,manifest.files);
 console.log('Candidate verified: production base, namespace, resources and '+Object.keys(baseline.files).filter(n=>n.startsWith('test/')).length+' unchanged test files');
}
export async function assemble(backup='production-backup',dist='dist',folder='production-site'){
 assert.ok(!process.env.VITE_SAVE_PREFIX,'Production build must use empty VITE_SAVE_PREFIX');
 assert.ok(!existsSync(folder),'Fresh candidate directory required');assert.deepEqual(await hashes(backup),baseline.files);
 await cp(backup,folder,{recursive:true});
 for(const [name,digest] of Object.entries(await hashes(dist))){safeName(name);assert.ok(!name.startsWith('test/'));if(baseline.files[name]&&name.startsWith('assets/'))assert.equal(digest,baseline.files[name],'Hashed asset collision');const target=resolve(folder,name);await mkdir(dirname(target),{recursive:true});await cp(resolve(dist,name),target)}
 const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 await writeFile(resolve(folder,'production-build.json'),JSON.stringify({version:'0.21.3',sourceCommit,base:'/Space-bar-rpg/',savePrefix:'',saveKey:'spacebar-restored-v020',schema:2,previousMain:baseline.mainCommit},null,2)+'\n');
 await writeFile(resolve(folder,'production-files.json'),JSON.stringify({version:'0.21.3',sourceCommit,files:await hashes(folder)},null,2)+'\n');await verifyCandidate(folder);
}
export async function pack(backup='production-backup'){
 assert.deepEqual(await hashes(backup),baseline.files);await mkdir('artifacts',{recursive:true});
 execFileSync('tar',['--sort=name','--mtime=UTC 2026-11-14','--owner=0','--group=0','--numeric-owner','--mode=u+rwX,go+rX,go-w','-czf','artifacts/published-before-0213.tar.gz','-C',backup,'.']);
 const bytes=await readFile('artifacts/published-before-0213.tar.gz');await writeFile('artifacts/published-before-0213.tar.gz.sha256',hash(bytes)+'  published-before-0213.tar.gz\n');
 await cp('hosting/production-before-0213.json','artifacts/production-before-0213.json');
}
export async function verifyLive(folder='production-site'){
 await verifyCandidate(folder);await verifyPublishedFiles(folder);console.log('Production HTTPS hashes verified; physical iPhone approval still required');
}
export async function verifyPublishedFiles(folder){
 for(let attempt=0;attempt<12;attempt++){
  try{for(const [name,digest] of Object.entries(await hashes(folder)))assert.equal(hash(await download(baseline.url+name)),digest,'Published file differs: '+name);return}
  catch(error){if(attempt===11)throw error;await new Promise(r=>setTimeout(r,5000))}
 }
}
export async function stageRollback(archive='artifacts/published-before-0213.tar.gz',folder='rollback-site'){
 assert.ok(!existsSync(folder),'Fresh rollback directory required');await mkdir(folder,{recursive:true});
 // Keep the new hashed assets too: cached 0.21.3 HTML can still request them after rollback.
 const response=await fetch(baseline.url+'production-files.json',{signal:AbortSignal.timeout(25000)});
 if(response.status!==404){assert.equal(response.status,200);const current=await response.json();for(const [name,digest] of Object.entries(current.files)){safeName(name);const bytes=await download(baseline.url+name);assert.equal(hash(bytes),digest,name);const file=resolve(folder,name);await mkdir(dirname(file),{recursive:true});await writeFile(file,bytes)}}
 for(const entry of execFileSync('tar',['-tzf',archive],{encoding:'utf8'}).trim().split('\n')){const name=entry.replace(/^\.\//,'').replace(/\/$/,'');if(name&&name!=='.')safeName(name)}
 // Read only named regular entries, never extract archive links into the filesystem.
 for(const [name,digest] of Object.entries(baseline.files)){const bytes=execFileSync('tar',['-xOzf',archive,'./'+name],{maxBuffer:20*1024*1024});assert.equal(hash(bytes),digest,name);const file=resolve(folder,name);await mkdir(dirname(file),{recursive:true});await writeFile(file,bytes)}
 await writeFile(resolve(folder,'production-build.json'),JSON.stringify({version:'0.21.0',sourceCommit:baseline.mainCommit,rollback:true,saveKey:'spacebar-restored-v020',savePrefix:''},null,2)+'\n');
 await writeFile(resolve(folder,'production-files.json'),JSON.stringify({version:'0.21.0',files:await hashes(folder)},null,2)+'\n');
 for(const [name,digest] of Object.entries(baseline.files))assert.equal(hash(await readFile(resolve(folder,name))),digest,name);
 console.log('Rollback staged from all 233 verified baseline files. No browser storage operation.');
}
export async function guard(){
 const response=await download('https://api.github.com/repos/64zszfrgmd-afk/Space-bar-rpg/branches/main');const main=JSON.parse(response).commit.sha;
 assert.equal(main,process.env.GITHUB_SHA,'A newer main exists: refusing stale publication');
 // Immediately before first production publication, all 233 inputs must still match.
 for(const [name,digest] of Object.entries(baseline.files))assert.equal(hash(await download(baseline.url+name)),digest,'Published baseline changed; capture and review it before deploy: '+name);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const commands={snapshot,assemble,pack,verify:verifyCandidate,'verify-live':verifyLive,guard,'stage-rollback':stageRollback,'verify-restored':()=>verifyPublishedFiles('rollback-site')};assert.ok(Object.hasOwn(commands,process.argv[2]),'Unknown production Pages command');await commands[process.argv[2]](...process.argv.slice(3));
}
