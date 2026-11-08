import * as THREE from 'three';
import type {Seat} from '../game/types';
export function createSeating(scene:THREE.Scene,obstacles:{x:number;z:number;w:number;d:number}[]):Seat[]{
  const seats:Seat[]=Array.from({length:4},(_,i)=>({id:`stool-${i+1}`,name:`Барный стул ${i+1}`,x:-8+i*1.9,z:-3.7,height:.88,yaw:0,exits:[{x:-8+i*1.9,z:-2.5}]}));
  const upholstery=new THREE.MeshStandardMaterial({color:'#bd639a',roughness:.9}),trim=new THREE.MeshStandardMaterial({color:'#6f4b87'});
  const box=(w:number,h:number,d:number,x:number,y:number,z:number,material=upholstery)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);scene.add(m)};
  for(const [index,x] of [-5.2,6.4].entries()){
    const z=7.6;box(3.9,.38,1.45,x,.3,z,trim);box(3.9,1,.23,x,.8,z+.62);for(const side of [-1,1])box(.22,.65,1.45,x+side*1.84,.58,z);
    obstacles.push({x,z,w:3.9,d:1.45});for(let i=0;i<3;i++){const sx=x+(i-1)*1.12;box(1.06,.2,1.05,sx,.48,z-.06);seats.push({id:`sofa-${index+1}-${i+1}`,name:`Диван ${index+1} · место ${i+1}`,x:sx,z:z-.12,height:.58,yaw:0,exits:[{x:sx,z:6.3},{x:x-2.5,z},{x:x+2.5,z}]})}
  }
  return seats;
}
export function posePlayer(player:THREE.Group,seated:Seat|null,time:number,moving:boolean,dancing:boolean){
  player.scale.y=seated?.78:1;
  player.position.y=seated?seated.height-.625*.78:dancing?Math.abs(Math.sin(time*7))*.17:moving?Math.sin(time*12)*.035:0;
  player.rotation.z=dancing?Math.sin(time*7)*.15:0;
  for(const [i,name] of ['leg-left','leg-right'].entries()){
    const leg=player.getObjectByName(name)!;leg.position.y=seated?.65:.3;leg.position.z=seated?.24:0;leg.rotation.x=seated?Math.PI/2:moving?Math.sin(time*12+i*Math.PI)*.45:dancing?Math.sin(time*7+i)*.4:0;
  }
  for(const [i,name] of ['arm-left','arm-right'].entries())player.getObjectByName(name)!.rotation.x=seated?-.35:dancing?Math.sin(time*7+i)*.7:moving?Math.sin(time*12+i*Math.PI)*.35:0;
  if(seated)player.rotation.y=seated.yaw+Math.PI;
}
