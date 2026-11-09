import {NPC_IDS, VERSION, CONTENT_REVISION, VENUE_IDS, SPECIES_IDS, JOB_IDS, bound} from './types';
import type {GameState, Relation, QuestStatus} from './types';
import {repairTravelAccess} from './access';
import {legacyNames} from './content';

export const SAVE_KEY = 'spacebar-restored-v020';
export interface StoragePort {getItem(key:string):string|null;setItem(key:string,value:string):void}
export const freshState = (): GameState => ({schema:2,version:VERSION,revision:CONTENT_REVISION,hero:{name:"Путешественник",species:"human",color:"#f2c19e",accessory:"none",dance:0},settings:{quality:"auto",volume:.7},venue:"nebula",visited:["nebula"],story:0,travelUnlocked:false,reputation:0,inventory:[],npcMoods:Object.fromEntries(NPC_IDS.map(id=>[id,50])),jobs:Object.fromEntries(JOB_IDS.map(id=>[id,{status:"new",progress:0}])) as GameState["jobs"],rhythm:{best:0,day:-1,paid:0},credits:120,energy:100,mood:65,buzz:0,met:[],relations:{},quests:{party:'new',syrup:'new'},partyDance:0,syrupStage:0,worldTime:0,decisions:[]});
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
  const hero=v.hero as Record<string,unknown>|undefined,settings=v.settings as Record<string,unknown>|undefined;
  if(hero&&typeof hero==='object'){
    state.hero.name=typeof hero.name==='string'?hero.name.trim().slice(0,24)||'Путешественник':'Путешественник';
    if(SPECIES_IDS.includes(hero.species as GameState['hero']['species']))state.hero.species=hero.species as GameState['hero']['species'];
    if(typeof hero.color==='string'&&/^#[0-9a-f]{6}$/i.test(hero.color))state.hero.color=hero.color;
    state.hero.dance=Math.floor(number(hero.dance,0,0,2)) as 0|1|2;
    if(hero.accessory==='hat'||hero.accessory==='halo')state.hero.accessory=hero.accessory;
  }
  if(settings&&typeof settings==='object'){if(['auto','low','balanced','high'].includes(String(settings.quality)))state.settings.quality=settings.quality as GameState['settings']['quality'];state.settings.volume=number(settings.volume,.7,0,1)}
  state.story=Math.floor(number(v.story,0,0,6));state.reputation=Math.floor(number(v.reputation,0));
  state.inventory=list(v.inventory);state.visited=list(v.visited).filter(id=>VENUE_IDS.includes(id as GameState['venue'])) as GameState['visited'];if(!state.visited.includes('nebula'))state.visited.unshift('nebula');
  state.travelUnlocked=v.travelUnlocked===true;repairTravelAccess(state);
  if(state.travelUnlocked&&VENUE_IDS.includes(v.venue as GameState['venue']))state.venue=v.venue as GameState['venue'];
  if(!state.visited.includes(state.venue))state.visited.push(state.venue);
  const moods=v.npcMoods as Record<string,unknown>|undefined;
  for(const id of NPC_IDS)state.npcMoods[id]=number(moods?.[id],50);
  const jobs=v.jobs as Record<string,Record<string,unknown>>|undefined;
  for(const id of JOB_IDS){const q=jobs?.[id];if(q&&['new','active','ready','done'].includes(String(q.status)))state.jobs[id]={status:q.status as QuestStatus,progress:number(q.progress,0,0,600)}}
  const rhythm=v.rhythm as Record<string,unknown>|undefined;if(rhythm&&typeof rhythm==='object')state.rhythm={best:Math.floor(number(rhythm.best,0,0,800)),day:Math.floor(number(rhythm.day,-1,-1,1e9)),paid:Math.floor(number(rhythm.paid,0,0,3))};
  return state;
}
export const BACKUP_KEY='spacebar-restored-v020-backup-before-0211';
let loadInfo={source:'fresh',version:'none',backup:false,repairs:[] as string[]};
export const getLoadInfo=()=>({...loadInfo,repairs:[...loadInfo.repairs]});
export function loadGame(storage:Pick<StoragePort,'getItem'>&Partial<Pick<StoragePort,'setItem'>>):GameState {
 loadInfo={source:'fresh',version:'none',backup:false,repairs:[]};
 for(const key of [SAVE_KEY,'spacebar-v1']){
  try{const text=storage.getItem(key),raw=JSON.parse(text||'null'),state=normalizeState(raw);if(state){
   loadInfo.source=key;loadInfo.version=String(raw.version??'0.1.0');
   if(raw.story!==state.story||raw.travelUnlocked!==state.travelUnlocked||JSON.stringify(raw.inventory??[])!==JSON.stringify(state.inventory))loadInfo.repairs.push('Согласованы сохранённый пропуск, доки и история путешествий.');
   if(key===SAVE_KEY&&raw.version!=='0.21.1'&&storage.setItem){try{if(!storage.getItem(BACKUP_KEY)){storage.setItem(BACKUP_KEY,text!);loadInfo.backup=true}}catch{/* Play even if backup storage is unavailable. */}}
   return state;
  }}catch{loadInfo.source='unavailable-or-invalid'}
 }
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
