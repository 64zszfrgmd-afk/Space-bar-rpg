import * as THREE from 'three';
import {it,expect} from 'vitest';
import {WorldRouter} from '../src/world/router';
import {WorldDiagnostics} from '../src/world/diagnostics';
import {overviewCamera,validateModel,modelIsVisible} from '../src/world/camera';
import {VENUE_IDS} from '../src/game/types';
import type {Room} from '../src/world/venue';
function room():Room {const group=new THREE.Group();for(let i=0;i<12;i++)group.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial()));return {group,tiles:[],obstacles:[],seats:[{id:'one',name:'seat',height:1,yaw:0,x:0,z:1,exits:[]}]}}
it('fits the corners of the actual room in portrait and landscape camera frusta',()=>{
 for(const [width,height] of [[320,568],[390,844],[844,390],[360,800]]){const camera=overviewCamera(width/height);for(const x of [-11,11])for(const y of [0,10])for(const z of [-9.5,9.5]){const p=new THREE.Vector3(x,y,z).project(camera);expect(Math.abs(p.x)).toBeLessThan(1);expect(Math.abs(p.y)).toBeLessThan(1);expect(p.z).toBeLessThan(1)}}
});
it('keeps the previous world and actor layers when building or rendering a destination fails',()=>{
 const scene=new THREE.Scene(),original=room(),layers=new Map(VENUE_IDS.map(id=>[id,new THREE.Group()] as const)),diagnostics=new WorldDiagnostics(),disposed:THREE.Group[]=[];let failBuild=false;
 const router=new WorldRouter(scene,original,layers,()=>{if(failBuild)throw Error('test missing scene');return room()},g=>{disposed.push(g);g.removeFromParent()},diagnostics);
 router.load('nebula',()=>{});let presented=false;const first=router.load('rust',r=>{expect(original.group.visible).toBe(false);expect(r.group.parent).toBe(scene);expect(layers.get('rust')!.visible).toBe(true);presented=true});expect(presented).toBe(true);expect(router.id).toBe('rust');
 failBuild=true;expect(router.load('echo',()=>{})).toBeNull();expect(router.current).toBe(first);expect(first!.group.visible).toBe(true);expect(layers.get('rust')!.visible).toBe(true);expect(router.id).toBe('rust');
 failBuild=false;expect(router.load('echo',()=>{throw Error('test GPU failure')})).toBeNull();expect(router.id).toBe('rust');expect(disposed).not.toContain(first!.group);expect(diagnostics.snapshot().map(i=>i.code)).toEqual(['LOCATION_LOAD_FAILED','LOCATION_LOAD_FAILED']);
 router.load('echo',()=>{});expect(disposed).toContain(first!.group);expect(router.status).toBe('ready');
});
it('hides the original world when a save starts directly in another venue',()=>{const original=room(),router=new WorldRouter(new THREE.Scene(),original,new Map(),()=>room(),()=>{},new WorldDiagnostics());router.load('orbit',()=>{});expect(original.group.visible).toBe(false)});
it('rejects invisible/empty models instead of reporting data-only NPC availability',()=>{const parent=new THREE.Group(),child=new THREE.Group();parent.add(child);expect(()=>validateModel(child)).toThrow();child.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial()));expect(validateModel(child)).toBe(1);expect(modelIsVisible(child)).toBe(true);parent.visible=false;expect(modelIsVisible(child)).toBe(false)});

it('keeps the successfully presented world if cleanup of its old geometry fails',()=>{const router=new WorldRouter(new THREE.Scene(),room(),new Map(),()=>room(),()=>{throw Error('cleanup failed')},new WorldDiagnostics());router.load('rust',()=>{});const next=router.load('echo',()=>{});expect(next).not.toBeNull();expect(router.current).toBe(next);expect(router.id).toBe('echo');expect(router.status).toBe('ready')});
