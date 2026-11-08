import {describe,it,expect} from 'vitest';
import {freshState,loadGame,normalizeState,saveGame,SAVE_KEY,advanceStats} from '../src/game/storage';
import {borksDrinks,bipDrinks,purchaseDrink} from '../src/game/drinks';
import {meet,greet,treat,claimGift,relation} from '../src/game/social';
import {acceptQuest,checkQuests,claimQuest,collectSyrup,deliverSyrup} from '../src/game/quests';
import {Seating} from '../src/player/seating';
import {movePlayer} from '../src/player/movement';
import type {Seat} from '../src/game/types';

describe('save migration and browser failures',()=>{
  it('migrates money/stats and previous display-name acquaintances without writing old keys',()=>{
    const data=new Map([['spacebar-v1',JSON.stringify({credits:72,mood:81,buzz:37,met:['Зора · навигатор','Квик · ботаник']})],['spacebar-save-v2','original older world']]);
    const storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v)}};
    const before=[...data],state=loadGame(storage);expect(state).toMatchObject({version:'0.20.0',credits:72,energy:100,mood:81,buzz:37,met:['zora','quik']});
    expect(saveGame(storage,state)).toBe(true);expect([...data].slice(0,2)).toEqual(before);expect(JSON.parse(data.get(SAVE_KEY)!)).toEqual(state);
  });
  it('prefers the new save, survives corruption, and accepts disabled storage',()=>{
    const old=JSON.stringify({...freshState(),credits:8});
    expect(loadGame({getItem:k=>k===SAVE_KEY?JSON.stringify({...freshState(),credits:17}):old}).credits).toBe(17);
    expect(loadGame({getItem:k=>k===SAVE_KEY?'{broken':old}).credits).toBe(8);
    expect(loadGame({getItem:()=>{throw Error('disabled')}})).toEqual(freshState());
    expect(saveGame({setItem:()=>{throw Error('quota')}},freshState())).toBe(false);
  });
  it('normalizes invalid stats and rejects invalid wallets',()=>{
    expect(normalizeState({credits:-1})).toBeNull();expect(normalizeState({credits:Infinity})).toBeNull();
    expect(normalizeState({credits:20,energy:-4,mood:999,buzz:NaN,met:[4,'zora','zora'],relations:{zip:{points:999}},quests:{party:'bogus'}})).toMatchObject({energy:0,mood:100,buzz:0,met:['zora'],relations:{zip:{points:9}},quests:{party:'new'}});
  });
});
describe('seven new drinks and the four preserved recipes',()=>{
  it('has seven unique Borks drinks including free sober water and two alcohol-free choices',()=>{expect(borksDrinks).toHaveLength(7);expect(new Set(borksDrinks.map(d=>d.id)).size).toBe(7);expect(borksDrinks.filter(d=>!d.alcoholic)).toHaveLength(2);expect(borksDrinks.find(d=>d.id==='water')).toMatchObject({price:0,buzz:-25,alcoholic:false})});
  it.each(borksDrinks)('$name charges exactly once per purchase and applies bounded effects',drink=>{
    const state={...freshState(),energy:50,mood:50,buzz:50},before=structuredClone(state),next=purchaseDrink(state,drink)!;
    expect(next.credits).toBe(120-drink.price);expect(next.energy).toBe(50+drink.energy);expect(next.mood).toBe(50+drink.mood);expect(next.buzz).toBe(50+drink.buzz);expect(state).toEqual(before);
  });
  it('rejects insufficient funds without changing stats; water remains free and cannot over-sober',()=>{const s={...freshState(),credits:0,buzz:2};expect(purchaseDrink(s,borksDrinks[0])).toBeNull();expect(purchaseDrink(s,borksDrinks[6])).toMatchObject({credits:0,buzz:0});expect(purchaseDrink(s,{...borksDrinks[0],price:-1})).toBeNull()});
  it('retains Bip prices and mood/intoxication effects',()=>{expect(bipDrinks.map(d=>[d.price,d.mood,d.buzz])).toEqual([[0,2,-25],[12,12,0],[20,20,22],[30,30,38]])});
});
describe('social and quest progression without buying alcohol',()=>{
  it('allows greetings and treats once a day and one friendship gift total',()=>{
    const s=freshState();expect(treat(s,'zip')).toBe(false);expect(meet(s,'zip')).toBe(true);expect(meet(s,'zip')).toBe(false);greet(s,'zip');expect(relation(s,'zip').points).toBe(1);
    expect(treat(s,'zip')).toBe(true);expect(treat(s,'zip')).toBe(false);expect(s.credits).toBe(110);expect(claimGift(s,'zip')).toBe(false);
    s.worldTime=480;greet(s,'zip');treat(s,'zip');expect(relation(s,'zip').points).toBe(6);expect(claimGift(s,'zip')).toBe(true);expect(claimGift(s,'zip')).toBe(false);expect(s.credits).toBe(125);
  });
  it('blocks out-of-order objectives, survives a save round trip and pays each quest once',()=>{
    let s=freshState();expect(acceptQuest(s,'syrup')).toBe(false);expect(collectSyrup(s)).toBe(false);expect(claimQuest(s,'party')).toBe(false);
    acceptQuest(s,'party');expect(acceptQuest(s,'party')).toBe(false);meet(s,'zora');s.partyDance=15;checkQuests(s);expect(s.quests.party).toBe('active');meet(s,'quik');checkQuests(s);expect(s.quests.party).toBe('ready');
    s=normalizeState(JSON.parse(JSON.stringify(s)))!;expect(claimQuest(s,'party')).toBe(true);expect(claimQuest(s,'party')).toBe(false);expect(s.credits).toBe(170);expect(s.buzz).toBe(0);
    expect(acceptQuest(s,'syrup')).toBe(true);expect(deliverSyrup(s)).toBe(false);expect(collectSyrup(s)).toBe(true);expect(collectSyrup(s)).toBe(false);s=normalizeState(s)!;expect(deliverSyrup(s)).toBe(true);expect(deliverSyrup(s)).toBe(false);expect(claimQuest(s,'syrup')).toBe(true);expect(claimQuest(s,'syrup')).toBe(false);expect(s.credits).toBe(255);expect(relation(s,'zip').points).toBe(7);
  });
});
describe('movement, sitting and energy',()=>{
  it('normalizes diagonal motion and prevents high-dt tunnelling through a wall',()=>{const a={x:0,z:0},b={x:0,z:0};movePlayer(a,1,0,0,3.5,.1,()=>true);movePlayer(b,1,1,0,3.5,.1,()=>true);expect(Math.hypot(a.x,a.z)).toBeCloseTo(Math.hypot(b.x,b.z));const c={x:0,z:0};movePlayer(c,1,0,0,50,3,x=>x<.4);expect(c.x).toBeLessThan(.4)});
  it('sits only within reach; returns to a free entry or a safe fallback; stays seated if blocked',()=>{
    const seat:Seat={id:'one',name:'test',x:0,z:0,height:.6,yaw:0,exits:[{x:0,z:-2}]},system=new Seating([seat]);
    expect(system.sit('one',{x:8,z:0})).toBeNull();const p={x:1,z:0};expect(system.sit('one',p)).toEqual(seat);p.x=8;expect(system.sit('one',{x:1,z:0})).toBeNull();expect(system.stand(()=>false)).toBeNull();expect(system.active).toBe(seat);expect(system.stand((x,z)=>x===0&&z===-2)).toEqual({x:0,z:-2});expect(system.active).toBeNull();
    system.sit('one',{x:1,z:0});expect(system.stand(()=>true)).toEqual({x:1,z:0});
  });
  it('recovers energy seated, consumes it running, preserves dancing mood, and bounds stats',()=>{
    const s={...freshState(),energy:40,mood:40,buzz:10};advanceStats(s,.1,{moving:true,running:true,seated:false,dancing:false});expect(s.energy).toBeCloseTo(39.7);
    advanceStats(s,.1,{moving:false,running:false,seated:true,dancing:false});expect(s.energy).toBeCloseTo(40);advanceStats(s,.1,{moving:false,running:false,seated:false,dancing:true});expect(s.mood).toBeGreaterThan(40.1);expect(s.buzz).toBeLessThan(10);const before=structuredClone(s);advanceStats(s,NaN,{moving:false,running:false,seated:true,dancing:false});expect(s).toEqual(before);
  });
});
