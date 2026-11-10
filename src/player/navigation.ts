import type {Point} from '../game/types';
export function findRoute(start:Point,free:(x:number,z:number)=>boolean,goal:(p:Point)=>boolean):Point[]|null{
 const step=.4,key=(x:number,z:number)=>x+','+z;
 const clear=(a:Point,b:Point)=>{const count=Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/.12);for(let i=1;i<=count;i++)if(!free(a.x+(b.x-a.x)*i/count,a.z+(b.z-a.z)*i/count))return false;return true};
 if(goal(start))return [];
 const sx=Math.round(start.x/step),sz=Math.round(start.z/step);let first:Point|null=null;
 for(let r=0;r<3&&!first;r++)for(let x=sx-r;x<=sx+r&&!first;x++)for(let z=sz-r;z<=sz+r;z++){const p={x:x*step,z:z*step};if(free(p.x,p.z)&&clear(start,p)){first={x,z};break}}
 if(!first)return null;
 const queue=[first],parents=new Map<string,Point|null>([[key(first.x,first.z),null]]);let end:Point|null=null;
 for(let index=0;index<queue.length&&index<4000;index++){
  const current=queue[index],p={x:current.x*step,z:current.z*step};if(goal(p)){end=current;break}
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const next={x:current.x+dx,z:current.z+dz},k=key(next.x,next.z),to={x:next.x*step,z:next.z*step};if(!parents.has(k)&&free(to.x,to.z)&&clear(p,to)){parents.set(k,current);queue.push(next)}}
 }
 if(!end)return null;const path:Point[]=[];for(let p:Point|null=end;p;p=parents.get(key(p.x,p.z))??null)path.push({x:p.x*step,z:p.z*step});return path.reverse();
}
