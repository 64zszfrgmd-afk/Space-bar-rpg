import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {freshState,normalizeState} from '../src/game/storage';
import {NPC_IDS,VENUE_IDS,SPECIES_IDS} from '../src/game/types';
import {npcDefinitions} from '../src/game/content';
import {venues,species,localJobs,worldItems} from '../src/game/world-data';
import {advanceStory} from '../src/game/story';
import {canTravel,travel,acceptJob,claimJob,collectWorldItem,deliverJob,addJobProgress} from '../src/game/world';
import {newRhythm,hitBeat,settleRhythm,rhythmFinished,BEAT_INTERVAL} from '../src/game/rhythm';
import {socialOffer} from '../src/game/profile';
import {meet,relation} from '../src/game/social';
import type {StoryAction} from '../src/game/story';

describe('catalog consistency',()=>{
 it('publishes matching build identity and catalog counts',()=>{expect(JSON.parse(readFileSync(new URL('../public/version.json',import.meta.url),'utf8'))).toMatchObject({version:'0.21.1',revision:'touch-flow-1',destinations:venues.length,npc:npcDefinitions.length,playableSpecies:species.length,quests:localJobs.length+3,multiplayer:false})});
 it('has 9 unique destinations, three new planets, 23 NPCs and five playable species',()=>{
  expect(venues.map(v=>v.id).sort()).toEqual([...VENUE_IDS].sort());expect(venues.filter(v=>v.kind==='club')).toHaveLength(4);expect(venues.filter(v=>v.kind==='bar')).toHaveLength(4);expect(new Set(venues.map(v=>v.planet)).size).toBe(4);
  expect(npcDefinitions.map(n=>n.id).sort()).toEqual([...NPC_IDS].sort());expect(npcDefinitions).toHaveLength(23);expect(species.map(s=>s.id).sort()).toEqual([...SPECIES_IDS].sort());
  for(const n of npcDefinitions)expect(VENUE_IDS).toContain(n.venue??'nebula');
  for(const q of localJobs){expect(NPC_IDS).toContain(q.owner);expect(npcDefinitions.find(n=>n.id===q.owner)?.venue).toBe(q.venue);if(q.deliverTo)expect(NPC_IDS).toContain(q.deliverTo)}
 });
 it('migrates a real previous 0.20 save while preserving its economy, friendships, quests and decisions',()=>{
  const old={schema:1,version:'0.20.0',credits:255,energy:42,mood:93,buzz:17,met:['zip','zora'],relations:{zip:{points:7,greetDay:0,treatDay:-1,gift:false}},quests:{party:'done',syrup:'done'},partyDance:15,syrupStage:2,worldTime:123,decisions:['kept']};
  const s=normalizeState(old)!;expect(s).toMatchObject({...old,version:'0.21.1',schema:2,story:0,venue:'nebula',hero:{name:'Путешественник',species:'human'},settings:{quality:'auto',volume:.7}});expect(s.jobs.coil.status).toBe('new');expect(normalizeState(JSON.parse(JSON.stringify(s)))).toEqual(s);
 });
 it('validates edited species, colors, quality, location and volume without breaking an old save',()=>{
  expect(normalizeState({...freshState(),hero:{name:' <Лира> ',species:'unknown',color:'javascript:bad',accessory:'broken'},settings:{quality:'bad',volume:4},venue:'echo',visited:['fake']})).toMatchObject({hero:{name:'<Лира>',species:'human',color:'#f2c19e',accessory:'none'},settings:{quality:'auto',volume:1},venue:'nebula',visited:['nebula']});
 });
});
describe('main story: two routes and free transport',()=>{
 it.each(['physical','digital'] as const)('completes %s route, persists the branch and pays once',route=>{
  let s=freshState();expect(canTravel(s,'echo')).toBe(false);expect(advanceStory(s,'exit')).toBe(false);
  for(const action of ['borks','witness','lyra','clue'] as StoryAction[])expect(advanceStory(s,action)).toBe(true);
  expect(advanceStory(s,route)).toBe(true);expect(advanceStory(s,route==='physical'?'digital':'physical')).toBe(false);expect(s.inventory.filter(i=>i==='station-pass')).toHaveLength(1);s=normalizeState(s)!;
  expect(advanceStory(s,'exit')).toBe(true);expect(advanceStory(s,'exit')).toBe(false);expect(s.credits).toBe(160);expect(s.decisions).toContain('pass:'+route);expect(s.reputation).toBe(5);
  s.credits=0;for(const v of venues)expect(travel(s,v.id)).toBe(true);expect(s.visited).toHaveLength(9);expect(s.credits).toBe(0);
 });
});
describe('local tasks with persistent one-time rewards',()=>{
 it('collects each world item once, requires the correct venue and claims only at its owner',()=>{
  const s=freshState();s.story=6;travel(s,'plankton');expect(acceptJob(s,'shells')).toBe(true);expect(acceptJob(s,'shells')).toBe(false);expect(collectWorldItem(s,'coil-unit')).toBe(false);
  for(const item of worldItems.filter(i=>i.job==='shells')){expect(collectWorldItem(s,item.id)).toBe(true);expect(collectWorldItem(s,item.id)).toBe(false)}
  expect(s.jobs.shells).toEqual({status:'ready',progress:3});expect(claimJob(s,'shells','nai')).toBe(false);expect(claimJob(s,'shells','myxa')).toBe(true);expect(claimJob(s,'shells','myxa')).toBe(false);expect(s.credits).toBe(160);
 });
 it('delivers a parcel across worlds, reloads its progress and requires returning to the owner',()=>{
  let s=freshState();s.story=6;travel(s,'comet');acceptJob(s,'parcel');expect(deliverJob(s,'parcel','borks')).toBe(false);expect(deliverJob(s,'parcel','aori')).toBe(false);travel(s,'orbit');expect(deliverJob(s,'parcel','aori')).toBe(true);expect(deliverJob(s,'parcel','aori')).toBe(false);
  s=normalizeState(JSON.parse(JSON.stringify(s)))!;expect(claimJob(s,'parcel','paf')).toBe(false);travel(s,'comet');expect(claimJob(s,'parcel','paf')).toBe(true);expect(s.credits).toBe(165);expect(s.inventory).not.toContain('parcel:parcel');
 });
 it.each(localJobs)('$name can pay once and cannot pay early',q=>{
  const s=freshState();s.story=6;travel(s,q.venue);expect(claimJob(s,q.id,q.owner)).toBe(false);acceptJob(s,q.id);expect(addJobProgress(s,q.id,-1)).toBe(false);expect(addJobProgress(s,q.id,NaN)).toBe(false);expect(addJobProgress(s,q.id,q.target)).toBe(true);expect(claimJob(s,q.id,q.owner)).toBe(true);expect(claimJob(s,q.id,q.owner)).toBe(false);expect(s.credits).toBe(120+q.reward);
 });
});
describe('rhythm timing, rewards and social preferences',()=>{
 it('rejects early/duplicate taps, resolves once, limits paid performances and remembers the best',()=>{
  const s=freshState(),run=newRhythm(0);expect(hitBeat(run,0)).toBe(false);
  for(let i=0;i<8;i++)expect(hitBeat(run,run.start+i*BEAT_INTERVAL)).toBe(true);expect(hitBeat(run,run.start+7*BEAT_INTERVAL)).toBe(false);expect(rhythmFinished(run,run.start)).toBe(false);expect(rhythmFinished(run,10)).toBe(true);
  expect(settleRhythm(s,run)).toEqual({score:760,reward:20});expect(settleRhythm(s,run)).toBeNull();
  for(let round=0;round<3;round++){const r=newRhythm(0);for(let i=0;i<8;i++)hitBeat(r,r.start+i*BEAT_INTERVAL);settleRhythm(s,r)}expect(s.credits).toBe(180);expect(s.rhythm.best).toBe(800);expect(s.rhythm.paid).toBe(3);
 });
 it('keeps refusal valid even at high friendship and prevents repeat farming the same invitation',()=>{
  const s=freshState();meet(s,'mira');relation(s,'mira').points=9;expect(socialOffer(s,'mira','dance','logic').accepted).toBe(false);expect(socialOffer(s,'mira','flirt','logic',false).accepted).toBe(false);
  meet(s,'zip');relation(s,'zip').points=3;expect(socialOffer(s,'zip','dance','music').accepted).toBe(true);expect(socialOffer(s,'zip','dance','music').accepted).toBe(false);expect(relation(s,'zip').points).toBe(4);
 });
});
