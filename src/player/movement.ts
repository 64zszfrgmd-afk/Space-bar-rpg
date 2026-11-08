import type {Point} from '../game/types';

export function movePlayer(position:Point,side:number,forward:number,yaw:number,speed:number,dt:number,free:(x:number,z:number)=>boolean):number {
  const length=Math.max(1,Math.hypot(side,forward));side/=length;forward/=length;
  const seconds=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;
  const dx=(side*Math.cos(yaw)+forward*Math.sin(yaw))*speed*seconds,dz=(-side*Math.sin(yaw)+forward*Math.cos(yaw))*speed*seconds;
  const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.15)),start={x:position.x,z:position.z};
  for(let i=0;i<count;i++){
    if(free(position.x+dx/count,position.z))position.x+=dx/count;
    if(free(position.x,position.z+dz/count))position.z+=dz/count;
  }
  return Math.hypot(position.x-start.x,position.z-start.z);
}
