import {chromium,webkit} from 'playwright';
import {spawn} from 'node:child_process';import {createHash} from 'node:crypto';import {existsSync} from 'node:fs';import {mkdir,writeFile} from 'node:fs/promises';import {resolve} from 'node:path';import assert from 'node:assert/strict';
const output=resolve(process.env.SPACEBAR_COMPARISON_OUT||'test-results/avatar-comparison'),url='http://127.0.0.1:6083/Space-bar-rpg/tests/avatar-comparison.html',reports=[];
await mkdir(output,{recursive:true});const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','6083','--strictPort'],{stdio:'pipe'});let log='';server.stderr.on('data',d=>log+=d);server.stdout.on('data',d=>log+=d);
try{
 for(let i=0;i<150;i++){try{if((await fetch(url)).ok)break}catch{}if(i===149)throw Error(log);await new Promise(r=>setTimeout(r,100))}
 for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
  if(!(process.env.SPACEBAR_BROWSERS||'chromium,webkit').split(',').includes(name))continue;
  const browser=await engine.launch({headless:true,...(name==='chromium'?{...(existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium'}:{}),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']}: {})});
  try{const page=await browser.newPage({viewport:{width:390,height:600}});await page.goto(url);await page.waitForFunction(()=>typeof window.avatarComparison==='function');const images=[];
   for(const view of ['rear','side'])for(const id of ['human','crystal','mycelian','orbion','ribbon']){
    const data=await page.evaluate(({id,view})=>window.avatarComparison(id,view),{id,view}),file=name+'-'+view+'-'+id+'.png';
    assert.ok(data.pixels>500,id+' visible '+view);assert.ok(data.width>15,id+' silhouette '+view);
    await writeFile(resolve(output,file),Buffer.from(data.png.split(',')[1],'base64'));data.maskHash=createHash('sha256').update(Buffer.from(data.mask)).digest('hex');delete data.mask;delete data.png;images.push({...data,file});
   }
   for(const image of images.filter(i=>['orbion','ribbon'].includes(i.id))){assert.ok(image.width>100,image.id+' broad silhouette '+image.view);assert.ok(image.pixels>10000,image.id+' substantial geometry in '+image.view)}
   for(const view of ['rear','side'])assert.equal(new Set(images.filter(i=>i.view===view).map(i=>i.maskHash)).size,5,'five distinct rendered silhouettes '+view);
   reports.push({engine:name,images});console.log('PASS '+name+': five real geometries at the same rear/side camera, scale and lighting');
  }finally{await browser.close()}
 }
 await writeFile(resolve(output,'results.json'),JSON.stringify({fixture:'neutral comparison, actual factory; production UI tested separately',reports},null,2)+'\n');
 const html='<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Space Bar RPG — сравнение пяти видов</title><style>body{background:#19152d;color:white;font:16px system-ui;margin:20px}.row{display:flex;gap:8px;overflow:auto}figure{margin:0;min-width:156px}img{width:156px}p{max-width:800px}</style><h1>Пять видов: один масштаб, камера и свет</h1><p>Те же фабрики геометрии, нейтральная сцена для сравнения сзади и сбоку. Игровой интерфейс и обычная камера проверяются отдельно. WebKit на Linux не подтверждает исправление на физическом iPhone.</p>'+reports.map(r=>'<h2>'+r.engine+'</h2>'+['rear','side'].map(v=>'<h3>'+(v==='rear'?'Сзади':'Сбоку')+'</h3><div class="row">'+r.images.filter(i=>i.view===v).map(i=>'<figure><img src="'+i.file+'"><figcaption>'+i.id+' · '+i.width+' px</figcaption></figure>').join('')+'</div>').join('')).join('')+'<p><a href="results.json">Фактическая геометрия и результаты</a></p>';
 await writeFile(resolve(output,'index.html'),html);
}finally{server.kill('SIGTERM')}
