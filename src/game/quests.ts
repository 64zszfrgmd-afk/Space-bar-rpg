import type {GameState,QuestId} from './types';
import {questDefinitions} from './content';
import {addFriendship,meet} from './social';

export function checkQuests(state:GameState):void {
  if(state.quests.party==='active'&&state.met.includes('zora')&&state.met.includes('quik')&&state.partyDance>=15)state.quests.party='ready';
  if(state.quests.syrup==='active'&&state.syrupStage===2)state.quests.syrup='ready';
}
export function acceptQuest(state:GameState,id:QuestId):boolean {
  if(state.quests[id]!=='new'||(id==='syrup'&&state.quests.party!=='done'))return false;
  meet(state,'zip');state.quests[id]='active';checkQuests(state);return true;
}
export function progressQuest(state:GameState,id:QuestId):string {
  if(id==='party')return `Зора: ${state.met.includes('zora')?'✓':'○'} · Квик: ${state.met.includes('quik')?'✓':'○'} · танец: ${Math.floor(state.partyDance)}/15 с`;
  return ['Найди ящик сиропа слева от стойки.','Сироп найден. Передай его Борксу.','Сироп у Боркса. Вернись к Зипу.'][state.syrupStage];
}
export function collectSyrup(state:GameState):boolean {if(state.quests.syrup!=='active'||state.syrupStage!==0)return false;state.syrupStage=1;return true}
export function deliverSyrup(state:GameState):boolean {if(state.quests.syrup!=='active'||state.syrupStage!==1)return false;state.syrupStage=2;checkQuests(state);return true}
export function claimQuest(state:GameState,id:QuestId):boolean {
  checkQuests(state);if(state.quests[id]!=='ready')return false;
  state.quests[id]='done';state.credits+=questDefinitions[id].reward;addFriendship(state,'zip',3);return true;
}
