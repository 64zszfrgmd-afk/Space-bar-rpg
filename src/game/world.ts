import {npcDefinitions} from './content';
import {localJobs,worldItems} from './world-data';
import {venues} from './world-data';
import type {GameState,JobId,NpcId,VenueId} from './types';
import {addFriendship,meet} from './social';
export function canTravel(s:GameState,id:VenueId):boolean{return venues.some(v=>v.id===id)&&(id==='nebula'||s.story===6)}
export function travel(s:GameState,id:VenueId):boolean{if(!canTravel(s,id))return false;s.venue=id;if(!s.visited.includes(id))s.visited.push(id);return true}
export function acceptJob(s:GameState,id:JobId):boolean{
 const def=localJobs.find(q=>q.id===id)!;if(s.jobs[id].status!=='new'||s.venue!==def.venue||s.story!==6)return false;
 s.jobs[id].status='active';meet(s,def.owner);if(def.kind==='delivery')s.inventory.push('parcel:'+id);return true;
}
export function addJobProgress(s:GameState,id:JobId,value:number):boolean{
 const q=s.jobs[id],def=localJobs.find(q=>q.id===id)!;if(q.status!=='active'||!Number.isFinite(value)||value<=0)return false;
 q.progress=Math.min(def.target,q.progress+value);if(q.progress>=def.target)q.status='ready';return true;
}
export function collectWorldItem(s:GameState,id:string):boolean{
 const item=worldItems.find(i=>i.id===id);if(!item||s.venue!==item.venue||s.inventory.includes(id)||s.jobs[item.job].status!=='active')return false;
 s.inventory.push(id);return addJobProgress(s,item.job,1);
}
export function deliverJob(s:GameState,id:JobId,npc:NpcId):boolean{
 const def=localJobs.find(q=>q.id===id)!;if(def.kind!=='delivery'||def.deliverTo!==npc||(npcDefinitions.find(n=>n.id===npc)?.venue??'nebula')!==s.venue||!s.inventory.includes('parcel:'+id))return false;
 if(!addJobProgress(s,id,1))return false;s.inventory=s.inventory.filter(i=>i!=='parcel:'+id);return true;
}
export function claimJob(s:GameState,id:JobId,npc:NpcId):boolean{
 const def=localJobs.find(q=>q.id===id)!;if(s.jobs[id].status!=='ready'||def.owner!==npc||s.venue!==def.venue)return false;
 s.jobs[id].status='done';s.credits+=def.reward;s.reputation=Math.min(100,s.reputation+3);addFriendship(s,npc,2);return true;
}
