import type {GameState,NpcId,Relation} from './types';
import {bound} from './types';

export const currentDay=(state:GameState):number=>Math.floor(state.worldTime/480);
export function relation(state:GameState,id:NpcId):Relation {return state.relations[id]??={points:0,greetDay:-1,treatDay:-1,gift:false}}
export function addFriendship(state:GameState,id:NpcId,points:number):void {const r=relation(state,id);r.points=Math.max(0,Math.min(9,r.points+points))}
export function meet(state:GameState,id:NpcId):boolean {
  if(state.met.includes(id))return false;
  state.met.push(id);state.mood=bound(state.mood+10);greet(state,id);return true;
}
export function greet(state:GameState,id:NpcId):void {
  if(!state.met.includes(id))return;
  const r=relation(state,id);if(r.greetDay===currentDay(state))return;
  r.greetDay=currentDay(state);state.npcMoods[id]=bound((state.npcMoods[id]??50)+1);addFriendship(state,id,1);
}
export function treat(state:GameState,id:NpcId):boolean {
  const r=relation(state,id);if(!state.met.includes(id)||r.treatDay===currentDay(state)||state.credits<10)return false;
  state.credits-=10;state.npcMoods[id]=bound((state.npcMoods[id]??50)+5);r.treatDay=currentDay(state);addFriendship(state,id,2);return true;
}
export function claimGift(state:GameState,id:NpcId):boolean {
  const r=relation(state,id);if(r.gift||r.points<6)return false;r.gift=true;state.credits+=25;return true;
}
export function friendshipTitle(points:number):string {return points>=9?'Близкий друг':points>=6?'Друг':points>=3?'Знакомый':points>0?'Первая встреча':'Незнакомец'}
