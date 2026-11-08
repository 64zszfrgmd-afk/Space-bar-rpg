import {NPC_IDS, VERSION, bound} from './types';
import type {GameState, Relation, QuestStatus} from './types';
import {legacyNames} from './content';

export const SAVE_KEY = 'spacebar-restored-v020';
export interface StoragePort {getItem(key:string):string|null;setItem(key:string,value:string):void}
export const freshState = (): GameState => ({schema:1,version:VERSION,credits:120,energy:100,mood:65,buzz:0,met:[],relations:{},quests:{party:'new',syrup:'new'},partyDance:0,syrupStage:0,worldTime:0,decisions:[]});
const number = (value:unknown,fallback:number,min=0,max=100) => typeof value==='number'&&Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;
const list = (value:unknown):string[] => Array.isArray(value)?[...new Set(value.filter((s):s is string=>typeof s==='string'))]:[];
export function normalizeState(raw:unknown): GameState|null {
  if(!raw||typeof raw!=='object')return null;
  const v=raw as Record<string,unknown>;
  // At least the old wallet must be valid before treating this as a save.
  if(typeof v.credits!=='number'||!Number.isFinite(v.credits)||v.credits<0)return null;
  const state=freshState();
  state.credits=Math.floor(number(v.credits,120,0,Number.MAX_SAFE_INTEGER));
  state.energy=number(v.energy,100);state.mood=number(v.mood,65);state.buzz=number(v.buzz,0);
  state.met=list(v.met).map(id=>Object.hasOwn(legacyNames,id)?legacyNames[id]:id);state.met=[...new Set(state.met)];
  state.worldTime=number(v.worldTime,0,0,1e9);state.partyDance=number(v.partyDance,0,0,15);
  state.syrupStage=v.syrupStage===1||v.syrupStage===2?v.syrupStage:0;state.decisions=list(v.decisions);
  const relations=v.relations as Record<string,Partial<Relation>>|undefined;
  for(const id of NPC_IDS){
    const r=relations?.[id];
    if(r&&typeof r==='object')state.relations[id]={points:Math.floor(number(r.points,0,0,9)),greetDay:Math.floor(number(r.greetDay,-1,-1,1e9)),treatDay:Math.floor(number(r.treatDay,-1,-1,1e9)),gift:r.gift===true};
    else if(state.met.includes(id))state.relations[id]={points:1,greetDay:-1,treatDay:-1,gift:false};
  }
  const quests=v.quests as Record<string,unknown>|undefined;
  for(const id of ['party','syrup'] as const)if(['new','active','ready','done'].includes(String(quests?.[id])))state.quests[id]=quests![id] as QuestStatus;
  return state;
}
export function loadGame(storage:Pick<StoragePort,'getItem'>):GameState {
  for(const key of [SAVE_KEY,'spacebar-v1']){
    try{const state=normalizeState(JSON.parse(storage.getItem(key)||'null'));if(state)return state}catch{/* Try the legacy save after corrupt new data. */}
  }
  // The inaccessible original 0.20 save key is intentionally never overwritten.
  return freshState();
}
export function saveGame(storage:Pick<StoragePort,'setItem'>,state:GameState):boolean {
  try{storage.setItem(SAVE_KEY,JSON.stringify(state));return true}catch{return false}
}
export function advanceStats(state:GameState,dt:number,mode:{moving:boolean;running:boolean;dancing:boolean;seated:boolean}):void {
  const seconds=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;
  state.worldTime+=seconds;
  const rate=mode.seated?3:mode.moving?(mode.running?-3:-.12):mode.dancing?-.35:.8;
  state.energy=bound(state.energy+seconds*rate);
  state.mood=bound(state.mood+seconds*(mode.seated ? .1 : mode.dancing ? 1.5 : 0));
  state.buzz=bound(state.buzz-seconds*.14);
}
