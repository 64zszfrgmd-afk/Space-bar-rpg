import * as THREE from 'three';
import type {Seat} from '../game/types';
import {worldItems,type Venue} from '../game/world-data';
export interface Room {group:THREE.Group;seats:Seat[];obstacles:{x:number;z:number;w:number;d:number}[];tiles:THREE.Mesh[]}
export function buildVenue(venue:Venue):Room{
 const group=new THREE.Group(),seats:Seat[]=[],obstacles:Room['obstacles']=[],tiles:THREE.Mesh[]=[],palette=new Map<string,THREE.MeshStandardMaterial>();
 const mat=(color:string,glow=false)=>{const id=color+glow;if(!palette.has(id))palette.set(id,new THREE.MeshStandardMaterial({color,roughness:.7,...(glow?{emissive:color,emissiveIntensity:.5}:{})}));return palette.get(id)!};
 const m=mat(venue.wall),accent=mat(venue.accent,true),gold=mat('#e9b57c'),dark=mat('#28263f');
 const add=(geometry:THREE.BufferGeometry,material:THREE.Material,x:number,y:number,z:number)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);group.add(mesh);return mesh};
 const box=(w:number,h:number,d:number,material:THREE.Material,x:number,y:number,z:number)=>add(new THREE.BoxGeometry(w,h,d),material,x,y,z);
 const ball=(r:number,material:THREE.Material,x:number,y:number,z:number)=>add(new THREE.SphereGeometry(r,12,10),material,x,y,z);
 const cyl=(r:number,h:number,material:THREE.Material,x:number,y:number,z:number)=>add(new THREE.CylinderGeometry(r,r,h,16),material,x,y,z);
 box(22,.35,19,mat(venue.theme==='ember'?'#653744':venue.theme==='ocean'?'#17485c':'#393451'),0,-.2,0);box(22,6,.3,m,0,3,-9.5);box(.3,6,19,m,-11,3,0);box(.3,6,19,m,11,3,0);
 for(let i=-10;i<=10;i+=2){box(.025,.01,19,accent,i,.005,0);box(22,.01,.025,accent,0,.006,i)}
 box(20,.08,.08,accent,0,5.2,-9.2);box(.08,.08,18,accent,-10.7,.12,0);box(.08,.08,18,accent,10.7,.12,0);
 // A large viewport, with geometry particular to each planet.
 box(10,3.8,.08,mat('#08152c'),3.6,3.3,-9.25);for(const y of [1.35,5.25])box(10.2,.1,.12,gold,3.6,y,-9.1);
 if(venue.theme==='ember'){
  const sun=ball(1.35,mat('#f9b26c',true),5,3.6,-9.06);sun.scale.z=.1;
  for(let i=0;i<7;i++){const dune=ball(1.3,mat(i%2?'#bd786a':'#d99a72'),-.7+i*1.5,1.65,-9.02);dune.scale.set(1,.45,.09)}
 }else if(venue.theme==='ocean'){
  for(let i=0;i<14;i++){const coral=add(new THREE.ConeGeometry(.18,.6+(i%3)*.4,6),mat(i%2?'#77ddd1':'#af90fa',true),-.5+i*.65,1.65,-9.03);coral.rotation.z=Math.sin(i)*.2;ball(.045,accent,-.2+i*.61,2+(i%5)*.5,-9)}
  const jelly=ball(.7,mat('#7bbacb',true),5,3.6,-9.05);jelly.scale.set(1,.6,.12);for(let i=0;i<4;i++)cyl(.025,.8,accent,4.7+i*.2,2.9,-9.02);
 }else if(venue.theme==='cloud'){
  for(let i=0;i<12;i++){const cloud=ball(.75,mat(i%2?'#e3d2eb':'#bdb7eb'),-.5+(i%6)*1.6,2+Math.floor(i/6)*1.7,-9.04);cloud.scale.set(1,.45,.08)}
  for(let i=0;i<4;i++){const island=add(new THREE.OctahedronGeometry(.5),mat('#90cbb6'),i*2,2.7+(i%2)*1.6,-9);island.scale.set(1,.6,.1)}
 }else{
  const geo=new THREE.SphereGeometry(.025,6,4),stars=new THREE.InstancedMesh(geo,accent,64),dummy=new THREE.Object3D();
  for(let i=0;i<64;i++){dummy.position.set(-.6+((i*37)%97)/10,1.6+((i*19)%35)/10,-9.05);dummy.updateMatrix();stars.setMatrixAt(i,dummy.matrix)}group.add(stars);
  ball(.7,mat('#a998d9'),5,3.5,-9.02);
 }
 // Distinct architecture above walking height keeps the routes open.
 if(venue.theme==='ember'){
  for(const z of [-5,1,6]){const rib=add(new THREE.TorusGeometry(3.4,.12,6,24,Math.PI),gold,-10.55,2.2,z);rib.rotation.y=Math.PI/2}
  box(.13,.13,18,gold,-10.55,3.4,0);
  for(const x of [-8,-4]){const engine=add(new THREE.ConeGeometry(.4,1,10,1,true),dark,x,4.3,-1.8);engine.rotation.z=Math.PI;cyl(.35,.05,accent,x,3.8,-1.8)}
 }else if(venue.theme==='ocean'){
  for(const z of [-5,1,6]){const dome=add(new THREE.TorusGeometry(10,.06,5,36,Math.PI),accent,0,0,z);dome.rotation.z=0}
  for(const x of [-10.5,10.5])for(const z of [-4,3]){const tube=cyl(.23,3,m,x,1.5,z);tube.material=mat('#4c989d');obstacles.push({x,z,w:.46,d:.46});for(let i=0;i<3;i++)ball(.12,accent,x,1.8+i*.45,z)}
 }else if(venue.theme==='cloud'){
  for(const [x,z] of [[-7,-2],[6,1],[0,-6]]){const halo=add(new THREE.TorusGeometry(1.15,.08,6,32),accent,x,4.1,z);halo.rotation.x=Math.PI/2;for(let i=0;i<3;i++){const cloud=ball(.65,mat('#9d9dce'),x+(i-1)*.6,4.5,z);cloud.scale.y=.4}}
 }else if(venue.kind==='club'){
  const clock=add(new THREE.TorusGeometry(1.4,.08,6,40),accent,-10.7,3,0);clock.rotation.y=Math.PI/2;
  for(let i=0;i<8;i++)ball(.09,gold,-10.65,3+Math.sin(i*Math.PI/4)*1.1,Math.cos(i*Math.PI/4)*1.1);
 }
 const chair=(id:string,x:number,z:number,yaw=0)=>{cyl(.35,.16,gold,x,.8,z);cyl(.07,.7,dark,x,.4,z);cyl(.38,.07,accent,x,.04,z);seats.push({id:venue.id+'-'+id,name:'Стул · '+id,x,z,height:.88,yaw,exits:[{x:x-Math.sin(yaw),z:z+Math.cos(yaw)}]})};
 // Sofas are actual seats with backs, arms and a walkable approach.
 const sofaX=-5.2,sofaZ=7.5;box(3.9,.4,1.45,dark,sofaX,.3,sofaZ);box(3.9,.9,.23,m,sofaX,.8,sofaZ+.62);for(const side of [-1,1])box(.2,.6,1.4,accent,sofaX+side*1.85,.6,sofaZ);
 obstacles.push({x:sofaX,z:sofaZ,w:3.9,d:1.45});for(let i=0;i<3;i++){const x=sofaX+(i-1)*1.12;box(1.05,.18,1.05,mat(venue.accent),x,.48,sofaZ-.07);seats.push({id:venue.id+'-sofa-'+i,name:'Диван · место '+(i+1),x,z:sofaZ-.12,height:.58,yaw:0,exits:[{x,z:6.2}]})}
 if(venue.kind==='cabin'){
  box(3.3,.45,3.7,dark,5.5,.3,3.4);box(3.1,.23,3.5,mat('#b5a4cf'),5.5,.64,3.4);box(3.1,.1,2.1,accent,5.5,.81,4);box(2.7,.2,.65,gold,5.5,.88,2.2);box(3.3,1,.2,m,5.5,.9,1.6);obstacles.push({x:5.5,z:3.4,w:3.3,d:3.7});
  box(3,.15,1.3,gold,-6,1,-2);for(const x of [-7.2,-4.8])box(.1,1,.1,dark,x,.5,-2);chair('desk',-6,-.4);box(1.5,2,.08,accent,-9.4,2,-2.6);
 }else{
  const club=venue.kind==='club';
  if(club){
   box(1.4,1.3,6,m,8.5,.65,-3);box(1.65,.15,6.3,gold,8.5,1.38,-3);obstacles.push({x:8.5,z:-3,w:1.4,d:6});for(let i=0;i<3;i++)chair('bar-'+i,6.3,-4.8+i*1.8,-Math.PI/2);
   for(let i=0;i<9;i++){cyl(.09,.45,mat(['#aaf2d0','#ed96da','#ffd18a'][i%3]),9.8,1.9,-5.5+i*.6)}
   const arch=add(new THREE.TorusGeometry(3.7,.13,6,48,Math.PI),accent,1,2.5,6.9);arch.rotation.z=0;
   for(const x of [-2.4,4.4]){box(.9,2,.9,dark,x,1,6.8);for(let y=0;y<2;y++){const speaker=cyl(.28,.08,accent,x,.6+y*.75,6.3);speaker.rotation.x=Math.PI/2}}
  }else{
   box(6.6,1.3,1.4,m,-6,.65,-6.2);box(6.9,.16,1.65,gold,-6,1.38,-6.2);obstacles.push({x:-6,z:-6.2,w:6.9,d:1.65});for(let i=0;i<3;i++)chair('bar-'+i,-7.8+i*1.8,-4.35);
   for(let row=0;row<2;row++){box(6,.12,.5,gold,-6,2.3+row*.9,-8.8);for(let i=0;i<8;i++)cyl(.085,.4,mat(['#96e3bf','#e997c7','#b3a4e7'][i%3]),-8.5+i*.7,2.55+row*.9,-8.8)}
  }
  for(const [x,z] of [[-6,3.5],[6,5]]){cyl(.9,.16,gold,x,1,z);cyl(.13,1,dark,x,.5,z);obstacles.push({x,z,w:2,d:2})}
  for(let x=0;x<4;x++)for(let z=0;z<4;z++)tiles.push(box(.94,.05,.94,mat((x+z)%2?venue.accent:'#575779'),-.5+x,.04,2+z));
  box(3.2,.8,.65,dark,1,.4,6.5);box(3.2,.06,.65,accent,1,.85,6.5);for(const x of [.2,1.8])cyl(.3,.04,gold,x,.92,6.5);
 }
 // Entry/exit arch, accessible from every room; no new dynamic lights.
 for(const x of [-1.1,1.1])box(.12,2.4,.12,accent,x,1.2,8.6);box(2.3,.12,.12,accent,0,2.4,8.6);
 const title=document.createElement('canvas');title.width=1024;title.height=128;const ctx=title.getContext('2d')!;ctx.font='bold 52px sans-serif';ctx.fillStyle=venue.accent;ctx.textAlign='center';ctx.fillText(venue.name,512,82);const tex=new THREE.CanvasTexture(title),sign=new THREE.Mesh(new THREE.PlaneGeometry(8,1),new THREE.MeshBasicMaterial({map:tex,transparent:true}));sign.position.set(-4,4.4,-9.1);group.add(sign);
 for(const item of worldItems.filter(i=>i.venue===venue.id)){const object=add(new THREE.OctahedronGeometry(.22),accent,item.x,.42,item.z);object.name='item:'+item.id;cyl(.3,.08,dark,item.x,.08,item.z)}
 if(venue.id==='echo'){box(.8,1.1,.6,dark,4.5,.55,-2);box(.7,.5,.06,accent,4.5,1.3,-1.68)}
 return {group,seats,obstacles,tiles};
}
