import type {GameState,VenueId} from './types';
import {venues} from './world-data';
import {storyHints} from './story';
export const hasPass=(s:GameState)=>s.inventory.includes('station-pass');
export const docksOpen=(s:GameState)=>s.travelUnlocked||s.story===6||s.decisions.includes('docks:open');
export function travelAccess(s:GameState,id:VenueId):{allowed:boolean;code:string;message:string}{
 if(!venues.some(v=>v.id===id))return {allowed:false,code:'UNKNOWN_ROUTE',message:'Неизвестная локация. Открой карту заново.'};
 if(id==='nebula'||docksOpen(s))return {allowed:true,code:'ALLOWED',message:'Маршрут открыт.'};
 if(hasPass(s)||s.story===5)return {allowed:false,code:'DOCKS_NOT_VALIDATED',message:'Пропуск найден, но доки ещё закрыты. Нажми «Предъявить пропуск» на карте или используй выход за DJ-пультом.'};
 return {allowed:false,code:'PASS_MISSING',message:'Переход закрыт: пропуска пока нет. '+storyHints[s.story]};
}
// Preserve explicit evidence of access in old saves; never grant money or erase quest progress.
export function repairTravelAccess(s:GameState):string[]{
 const changes:string[]=[],visitedOther=s.visited.some(id=>id!=='nebula');
 if(docksOpen(s)||visitedOther){
  if(s.story!==6||!s.travelUnlocked||!hasPass(s))changes.push('Восстановлен ранее открытый доступ к докам. Награда повторно не начислялась.');
  s.story=6;s.travelUnlocked=true;if(!hasPass(s))s.inventory.push('station-pass');if(!s.decisions.includes('docks:open'))s.decisions.push('docks:open');
 }else if(hasPass(s)||s.decisions.some(d=>d==='pass:physical'||d==='pass:digital')){
  if(s.story<5){s.story=5;changes.push('Пропуск сохранён; осталось предъявить его на карте.')}if(!hasPass(s))s.inventory.push('station-pass');
 }
 return changes;
}
