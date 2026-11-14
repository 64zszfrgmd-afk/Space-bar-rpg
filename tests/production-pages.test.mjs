import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {baseline,hash,safeName,checkPreserved,assertPublicationAllowed} from '../scripts/production-pages.mjs';

test('all three existing test versions and production have pinned recovery inputs',()=>{
 assert.equal(Object.keys(baseline.files).length,233);
 for(const v of ['0.21.1','0.21.2','0.21.3'])assert.ok(baseline.files['test/'+v+'/index.html']);
 assert.ok(baseline.files['index.html']);
});
test('publication refuses deleted test screenshots, changed test scripts and missing cached root assets',()=>{
 for(const name of ['test/0.21.3/index.html',Object.keys(baseline.files).find(n=>n.endsWith('.png')),Object.keys(baseline.files).find(n=>n.startsWith('assets/'))]){
  const after={...baseline.files};delete after[name];assert.throws(()=>checkPreserved(baseline.files,after),/lost\/changed/);
 }
 checkPreserved(baseline.files,{...baseline.files,'index.html':'new-main','version.json':'new-version'});
});
test('snapshot paths cannot escape the staging directory',()=>{for(const name of ['../index','/tmp/index','test//index','test/./index','test/../index','a\\b'])assert.throws(()=>safeName(name));assert.equal(safeName('test/0.21.3/index.html'),'test/0.21.3/index.html')});
test('queued or repeated production runs cannot undo an approved rollback',()=>{assert.throws(()=>assertPublicationAllowed({version:'0.21.0',rollback:true}),/rollback freeze/);assertPublicationAllowed({version:'0.21.3'})});
test('permanent root recovery archive matches every current production file',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../hosting/production-0.21.0.json',import.meta.url),'utf8'));
 const archive=new URL('../hosting/production-0.21.0.tar.gz',import.meta.url);
 assert.equal(hash(await readFile(archive)),manifest.archiveSha256);
 for(const [name,digest] of Object.entries(manifest.files))assert.equal(hash(execFileSync('tar',['-xOzf',archive.pathname,'./'+name])),digest,name);
});
