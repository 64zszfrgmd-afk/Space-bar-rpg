import type {GameState,NpcId} from './types';
import {bound} from './types';
import {relation,currentDay,addFriendship} from './social';
export function socialOffer(s:GameState,id:NpcId,kind:'dance'|'flirt',preference:string,flirtable=false):{accepted:boolean;text:string}{
 const key=`offer:${id}:${kind}:${currentDay(s)}`;
 if(s.decisions.includes(key))return {accepted:false,text:'Давай оставим немного новостей на следующий день.'};
 s.decisions.push(key);const points=relation(s,id).points;
 const accepted=s.met.includes(id)&&(kind==='dance'?points>=3&&preference==='music':points>=6&&flirtable);
 if(accepted){addFriendship(s,id,1);s.mood=bound(s.mood+5);s.npcMoods[id]=bound((s.npcMoods[id]??50)+5);return {accepted:true,text:kind==='dance'?'С радостью! Обмениваемся танцевальным движением — без нарушения законов гравитации.':'Улыбка принята. Мне приятно, что мы стали ближе.'}}
 return {accepted:false,text:kind==='flirt'?flirtable?'Давай сначала узнаем друг друга получше.':'Мне нравится наша дружба. Романтику оставим звёздам.':preference!=='music'?'Спасибо, я лучше послушаю музыку отсюда. Люблю спокойные вечера.':'Пока стесняюсь. Давай сначала познакомимся поближе.'};
}
