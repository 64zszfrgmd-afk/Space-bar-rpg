import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {SPECIES_IDS} from '../src/game/types';
import {freshState,normalizeState} from '../src/game/storage';
import {createHeroModel,heroGeometry} from '../src/world/hero';
import {posePlayer} from '../src/world/seats';
import {disposeGroup} from '../src/world/aliens';

// Sample actual transformed vertices, including the alien-specific appendages.
function vertices(player:THREE.Group){
 player.updateMatrixWorld(true);const values:number[]=[];
 player.traverse(n=>{if(n instanceof THREE.Mesh){const position=n.geometry.getAttribute('position');for(let i=0;i<position.count;i+=Math.max(1,Math.floor(position.count/8))){const p=new THREE.Vector3().fromBufferAttribute(position,i).applyMatrix4(n.matrixWorld);values.push(...p.toArray())}}});return values;
}
const distance=(a:number[],b:number[])=>Math.max(...a.map((v,i)=>Math.abs(v-b[i])));
describe('three real dances for every player species',()=>{
 it.each(SPECIES_IDS)('%s has three different moving vertex trajectories',species=>{
  const player=new THREE.Group(),model=createHeroModel({...freshState().hero,species});player.add(model);const original=heroGeometry(model).signature;
  const trajectories=[0,1,2].map(style=>[.13,.37,.81,1.19].map(time=>{posePlayer(player,null,time,false,true,style);const v=vertices(player);expect(v.every(Number.isFinite)).toBe(true);expect(heroGeometry(model).signature).toBe(original);return v}));
  for(const path of trajectories)expect(distance(path[0],path[2])).toBeGreaterThan(.1);
  for(const [a,b] of [[0,1],[0,2],[1,2]])expect(distance(trajectories[a].flat(),trajectories[b].flat())).toBeGreaterThan(.2);
  if(species==='orbion'||species==='ribbon'){
   const limbs:THREE.Object3D[]=[];model.traverse(n=>{if(typeof n.userData.tentacle==='number'||typeof n.userData.flap==='number')limbs.push(n)});expect(limbs.length).toBeGreaterThan(1);
   const poses=[0,1,2].map(style=>{posePlayer(player,null,.73,false,true,style);return limbs.flatMap(n=>[n.rotation.x,n.rotation.y,n.rotation.z])});expect(new Set(poses.map(p=>JSON.stringify(p))).size).toBe(3);
  }
  disposeGroup(player);
 });
 it.each(['orbion','ribbon'] as const)('%s leaves no stale dance deformation in idle or seats',species=>{
  const player=new THREE.Group();player.add(createHeroModel({...freshState().hero,species}));posePlayer(player,null,.4,false,false);const idle=vertices(player);
  for(const style of [0,1,2]){posePlayer(player,null,.8,false,true,style);posePlayer(player,null,.4,false,false);expect(vertices(player)).toEqual(idle)}
  const seat={id:'test',name:'test',x:0,z:0,height:.88,yaw:0,exits:[]};posePlayer(player,seat,.4,false,false);const sitting=vertices(player);posePlayer(player,seat,.4,false,true,2);expect(vertices(player)).toEqual(sitting);disposeGroup(player);
 });
 it('loads every existing numeric dance choice without resetting species or progress',()=>{
  for(const version of ['0.20.0','0.21.0','0.21.3'])for(const dance of [0,1,2] as const){
   const old={...freshState(),version,credits:543,story:6,travelUnlocked:true,venue:'rust',inventory:['station-pass'],hero:{...freshState().hero,species:'ribbon',dance}};
   const restored=normalizeState(old)!;expect(restored.hero).toEqual(old.hero);expect(restored.credits).toBe(543);expect(restored.venue).toBe('rust');expect(restored.story).toBe(6);
  }
 });
});
