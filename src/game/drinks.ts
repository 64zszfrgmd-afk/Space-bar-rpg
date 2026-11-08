import type {Drink,GameState} from './types';
import {bound} from './types';

export const borksDrinks:readonly Drink[]=[
  {id:'quantum-ruff',name:'Квантовый ёрш',price:15,energy:-4,mood:8,buzz:18,alcoholic:true,description:'Понедельник, который решил стать пятницей.'},
  {id:'supernova-tears',name:'Слёзы сверхновой',price:24,energy:-8,mood:14,buzz:28,alcoholic:true,description:'Звезда остыла. Счёт за её вечеринку — ещё нет.'},
  {id:'dark-matter',name:'Тёмная материя',price:30,energy:-12,mood:18,buzz:36,alcoholic:true,description:'Кредиты исчезнут. Учёные наконец смогут что-то измерить.'},
  {id:'antigravity',name:'Антигравитационный коктейль',price:22,energy:10,mood:10,buzz:12,alcoholic:true,description:'Лёгкость в мыслях. Гравитация станции продолжает работать.'},
  {id:'singularity',name:'Безалкогольная сингулярность',price:12,energy:20,mood:8,buzz:-10,alcoholic:false,description:'Поглощает усталость, возвращает вкус к исследованиям.'},
  {id:'cucumber',name:'Квантовый огурец',price:15,energy:0,mood:5,buzz:20,alcoholic:true,description:'Фирменный рецепт Зипа. Огурцы пережили несколько поколений барменов.'},
  {id:'water',name:'Вода',price:0,energy:0,mood:0,buzz:-25,alcoholic:false,description:'Прозрачная, бесплатная и не интересуется твоими секретами.'},
];
export const bipDrinks:readonly Drink[]=[
  {id:'lunar-water',name:'Лунная вода',price:0,energy:0,mood:2,buzz:-25,alcoholic:false,description:'Прежняя бесплатная вода Бипа.'},
  {id:'lemonade',name:'Орбитальный лимонад',price:12,energy:0,mood:12,buzz:0,alcoholic:false,description:'Знакомый вкус первого визита.'},
  {id:'mojito',name:'Космический мохито',price:20,energy:0,mood:20,buzz:22,alcoholic:true,description:'Старый рецепт Бипа с прежней ценой.'},
  {id:'supernova',name:'Сверхновая',price:30,energy:0,mood:30,buzz:38,alcoholic:true,description:'Прежняя сверхновая, без изменения рецепта.'},
];
export function purchaseDrink(state:GameState,drink:Drink):GameState|null {
  if(!Number.isFinite(state.credits)||!Number.isFinite(drink.price)||drink.price<0||state.credits<drink.price)return null;
  return {...state,credits:state.credits-drink.price,energy:bound(state.energy+drink.energy),mood:bound(state.mood+drink.mood),buzz:bound(state.buzz+drink.buzz)};
}
export const signed=(n:number):string=>n>0?'+'+n:String(n);
export const effects=(drink:Pick<Drink,'energy'|'mood'|'buzz'>):string=>`Энергия ${signed(drink.energy)} · настроение ${signed(drink.mood)} · опьянение ${signed(drink.buzz)}`;
