import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {createHeroModel,heroGeometry,replaceHero} from '../src/world/hero';
import {disposeGroup} from '../src/world/aliens';
import {posePlayer} from '../src/world/seats';
import {freshState,normalizeState} from '../src/game/storage';
import {SPECIES_IDS} from '../src/game/types';
import type {Seat} from '../src/game/types';

describe('actual playable hero geometry',()=>{
 it('has five distinct vertex/index geometries with identical colors and accessories',()=>{
  const profiles=SPECIES_IDS.map(species=>createHeroModel({...freshState().hero,species}));
  expect(new Set(profiles.map(model=>heroGeometry(model).signature)).size).toBe(5);
  for(const model of profiles){
   const result=heroGeometry(model),bounds=new THREE.Box3().setFromObject(model);
   expect(result.meshes).toBeGreaterThan(8);expect(result.vertices).toBeGreaterThan(100);
   expect(bounds.max.y-bounds.min.y).toBeGreaterThan(1.5);
   expect([...bounds.min.toArray(),...bounds.max.toArray()].every(Number.isFinite)).toBe(true);
   for(const name of ['leg-left','leg-right','arm-left','arm-right'])expect(model.getObjectByName(name)).toBeTruthy();
   disposeGroup(model);
  }
 });
 it('does not mistake a color change or pose animation for new geometry',()=>{
  for(const species of SPECIES_IDS){
   const a=createHeroModel({...freshState().hero,species,color:'#ff0011'}),b=createHeroModel({...freshState().hero,species,color:'#0011ff'});
   const signature=heroGeometry(a).signature;expect(heroGeometry(b).signature).toBe(signature);
   const player=new THREE.Group();player.add(a);
   const seat:Seat={id:'test',name:'test',x:0,z:0,height:.88,yaw:0,exits:[]};
   for(const mode of ['idle','walk','dance0','dance1','dance2','seat']){
    posePlayer(player,mode==='seat'?seat:null,1.2,mode==='walk',mode.startsWith('dance'),Number(mode.slice(-1))||0);
    expect(heroGeometry(a).signature).toBe(signature);
    const box=new THREE.Box3().setFromObject(player);expect([...box.min.toArray(),...box.max.toArray()].every(Number.isFinite)).toBe(true);
   }
   const leg=a.getObjectByName('leg-left')!;posePlayer(player,null,.1,true,false);const before=leg.rotation.x;posePlayer(player,null,.3,true,false);expect(leg.rotation.x).not.toBe(before);
   disposeGroup(player);disposeGroup(b);
  }
 });
 it('replaces the attached model and profile together, preserving unrelated progress and position',()=>{
  const state=freshState();state.credits=321;state.story=6;state.inventory=['station-pass'];state.quests.party='done';
  const player=new THREE.Group();player.position.set(3,.4,-2);player.add(createHeroModel(state.hero));
  const old=player.children[0],oldGeometry=old.getObjectByProperty('type','Mesh') as THREE.Mesh;
  let disposed=false;oldGeometry.geometry.addEventListener('dispose',()=>disposed=true);
  const progress=JSON.stringify({credits:state.credits,story:state.story,inventory:state.inventory,quests:state.quests});
  const model=replaceHero(state,player,{species:'orbion'});
  expect(player.children).toEqual([model]);expect(old.parent).toBeNull();expect(disposed).toBe(true);
  expect(state.hero.species).toBe('orbion');expect(heroGeometry(model).species).toBe('orbion');
  expect(player.position.toArray()).toEqual([3,.4,-2]);expect(JSON.stringify({credits:state.credits,story:state.story,inventory:state.inventory,quests:state.quests})).toBe(progress);
  disposeGroup(player);
 });
 it('keeps the previous state and model if validation or preview rendering fails',()=>{
  const state=freshState(),player=new THREE.Group(),before=structuredClone(state);player.add(createHeroModel(state.hero));const original=player.children[0];
  expect(()=>replaceHero(state,player,{species:'crystal'},()=>{throw Error('GPU draw failed')})).toThrow('GPU draw failed');
  expect(state).toEqual(before);expect(player.children).toEqual([original]);expect(original.parent).toBe(player);disposeGroup(player);
 });
 it('restores every selected species from a 0.21.1 save without resetting the game',()=>{
  for(const species of SPECIES_IDS){
   const old={...freshState(),version:'0.21.1',credits:456,story:6,travelUnlocked:true,venue:'rust',inventory:['station-pass'],hero:{...freshState().hero,species}};
   const state=normalizeState(old)!;expect(state.hero.species).toBe(species);expect(state.credits).toBe(456);expect(state.venue).toBe('rust');expect(state.story).toBe(6);
   const player=new THREE.Group();replaceHero(state,player);expect(heroGeometry(player.children[0]).species).toBe(species);disposeGroup(player);
  }
 });
 it('leaves the three working species byte-identical to 0.21.2',()=>{
  for(const [species,signature] of [['human','da8a36ba'],['crystal','f64e2844'],['mycelian','be574f52']] as const){const model=createHeroModel({...freshState().hero,species});expect(heroGeometry(model).signature).toBe(signature);disposeGroup(model)}
 });
 it('has finite solid ribbon surfaces and broad Orbion geometry in rear and side projections',()=>{
  for(const species of ['orbion','ribbon'] as const){
   const model=createHeroModel({...freshState().hero,species}),size=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
   expect(size.x).toBeGreaterThan(1.6);expect(size.z).toBeGreaterThan(1.1);
   model.traverse(node=>{if(node instanceof THREE.Mesh){expect([...node.geometry.getAttribute('normal').array].every(Number.isFinite)).toBe(true);if(species==='ribbon'&&node.geometry.type==='BufferGeometry'){const b=new THREE.Box3().setFromBufferAttribute(node.geometry.getAttribute('position') as THREE.BufferAttribute);expect(b.max.z-b.min.z).toBeGreaterThan(.08)}}});
   disposeGroup(model);
  }
 });
 it('keeps the old model, transforms and state when actual scene presentation fails',()=>{
  const state=freshState(),before=structuredClone(state),player=new THREE.Group();player.position.set(3,.4,-2);player.rotation.set(0,Math.PI,0);const old=createHeroModel(state.hero);player.add(old);let oldDisposed=false;old.traverse(n=>{if(n instanceof THREE.Mesh)n.geometry.addEventListener('dispose',()=>oldDisposed=true)});
  expect(()=>replaceHero(state,player,{species:'orbion'},undefined,[],()=>{player.position.y=5;throw Error('Main framebuffer draw failed')})).toThrow('Main framebuffer draw failed');
  expect(state).toEqual(before);expect(player.children).toEqual([old]);expect(player.position.toArray()).toEqual([3,.4,-2]);expect(oldDisposed).toBe(false);expect(player.rotation.toArray()).toEqual([0,Math.PI,0,'XYZ']);posePlayer(player,null,1,false,false);expect(new THREE.Box3().setFromObject(player).min.y).toBeGreaterThan(-.1);disposeGroup(player);
 });
 it('replaces and disposes models throughout the reported seven-step sequence without changing progress',()=>{
  const state=freshState();state.credits=321;state.story=6;state.inventory=['station-pass'];state.quests.party='done';const before=structuredClone(state),player=new THREE.Group();player.position.set(2,0,1);let previous:THREE.Group|undefined;
  for(const species of ['human','orbion','ribbon','crystal','orbion','mycelian','ribbon'] as const){let disposed=false;previous?.traverse(n=>{if(n instanceof THREE.Mesh)n.geometry.addEventListener('dispose',()=>disposed=true)});const next=replaceHero(state,player,{species});expect(player.children).toEqual([next]);if(previous){expect(disposed).toBe(true);expect(previous.parent).toBeNull()}expect({...state,hero:before.hero}).toEqual(before);expect(player.position.toArray()).toEqual([2,0,1]);previous=next}
  disposeGroup(player);
 });
});
