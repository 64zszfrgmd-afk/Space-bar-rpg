import * as THREE from 'three';
import type {GameState,SpeciesId} from '../game/types';
import {disposeGroup} from './aliens';
import {validateModel} from './camera';

export type HeroProfile=GameState['hero'];

function ribbon(points:number[][],width:number){
 const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p as [number,number,number]))),samples=path.getPoints(16),positions:number[]=[],indices:number[]=[];
 samples.forEach((p,i)=>{
  const tangent=path.getTangent(i/(samples.length-1)),side=tangent.cross(new THREE.Vector3(0,0,1)).normalize().multiplyScalar(width*(.2+.8*Math.sin(Math.PI*i/(samples.length-1)))/2);
  positions.push(...p.clone().add(side).toArray(),...p.clone().sub(side).toArray());
  if(i<samples.length-1){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2)}
 });
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

// This factory is exclusively for the player. Existing NPC geometry stays in aliens.ts.
export function createHeroModel(profile:HeroProfile):THREE.Group{
 const model=new THREE.Group();model.name='hero-model';model.userData.heroSpecies=profile.species;
 model.userData.eyeHeight=({human:1.7,crystal:1.75,mycelian:1.5,orbion:1.6,ribbon:2.15} satisfies Record<SpeciesId,number>)[profile.species];
 const skin=new THREE.MeshStandardMaterial({color:profile.color,roughness:.6,flatShading:profile.species==='crystal',side:profile.species==='ribbon'?THREE.DoubleSide:THREE.FrontSide});
 const dark=new THREE.MeshStandardMaterial({color:'#25243e',roughness:.65});
 const white=new THREE.MeshStandardMaterial({color:'#e9ecfa',roughness:.55});
 const suit=new THREE.MeshStandardMaterial({color:'#368c9e',roughness:.8});
 const glow=new THREE.MeshStandardMaterial({color:'#8af6e0',emissive:'#39a7ae',emissiveIntensity:.45,side:THREE.DoubleSide});
 const mesh=(geo:THREE.BufferGeometry,mat:THREE.Material,x:number,y:number,z:number,parent:THREE.Object3D=model)=>{
  const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);parent.add(m);return m;
 };
 const ball=(radius:number,mat:THREE.Material,x:number,y:number,z:number,scale:[number,number,number]=[1,1,1],parent:THREE.Object3D=model)=>mesh(new THREE.SphereGeometry(radius,16,10).scale(...scale),mat,x,y,z,parent);
 const box=(x:number,y:number,z:number,w:number,h:number,d:number,mat:THREE.Material,parent:THREE.Object3D=model)=>mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z,parent);
 const joint=(name:string,x:number,y:number,z=0)=>{
  const limb=new THREE.Group();limb.name=name;limb.position.set(x,y,z);limb.userData.heroRest=[x,y,z];model.add(limb);return limb;
 };
 const eyes=(xs:number[],y:number,z:number,r=.075)=>{for(const x of xs){ball(r,white,x,y,z);ball(r*.48,dark,x,y,z+r*.78)}};
 for(const side of [-1,1]){
  const suffix=side<0?'left':'right',leg=joint('leg-'+suffix,side*(profile.species==='orbion'?.27:.18),profile.species==='orbion'?.9:profile.species==='ribbon'?.76:.63);
  const arm=joint('arm-'+suffix,side*(profile.species==='orbion'?.56:profile.species==='ribbon'?.24:profile.species==='mycelian'?.25:.39),profile.species==='ribbon'?1.7:1.32);
  arm.rotation.z=side*.12;arm.userData.restZ=arm.rotation.z;
  if(profile.species==='human'){
   mesh(new THREE.CapsuleGeometry(.105,.3,3,10),white,0,-.25,0,leg);box(0,-.52,.07,.23,.18,.34,dark,leg);
   mesh(new THREE.CapsuleGeometry(.09,.3,3,10),suit,0,-.23,0,arm);ball(.12,white,0,-.45,0,[1,1,1],arm);ball(.14,white,0,0,0,[1,1,1],arm);
  }else if(profile.species==='crystal'){
   mesh(new THREE.ConeGeometry(.13,.56,4).rotateZ(Math.PI),skin,0,-.26,0,leg);
   mesh(new THREE.OctahedronGeometry(.18).scale(.7,1.8,.7),skin,0,-.23,0,arm);
   mesh(new THREE.ConeGeometry(.08,.28,4),glow,0,-.48,.04,arm);
  }else if(profile.species==='mycelian'){
   mesh(new THREE.CapsuleGeometry(.08,.26,2,8),skin,0,-.25,0,leg);ball(.14,white,side*.04,-.5,.06,[1,.65,1.3],leg);
   mesh(new THREE.CapsuleGeometry(.06,.35,2,8),skin,0,-.23,0,arm);ball(.1,glow,0,-.45,.02,[1,1,1],arm);
  }else if(profile.species==='orbion'){
   mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(),new THREE.Vector3(side*.08,-.23,.12),new THREE.Vector3(side*.12,-.52,.2)]),10,.075,6,false),skin,0,0,0,leg);
   mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(),new THREE.Vector3(side*.24,-.12,.06),new THREE.Vector3(side*.17,-.28,.24)]),8,.055,6,false),glow,0,0,0,arm);
  }else{
   mesh(ribbon([[0,0,0],[side*.08,-.24,.12],[side*.2,-.51,-.04],[side*.12,-.71,.07]],.19),glow,0,0,0,leg);
   mesh(ribbon([[0,0,0],[side*.47,-.12,.04],[side*.6,-.55,-.1],[side*.2,-1.1,.08]],.25),glow,0,0,0,arm);
   const fin=joint('ribbon-fin-'+suffix,side*.2,1.93,-.12);fin.userData.flap=side;
   mesh(ribbon([[0,0,0],[side*.54,.15,-.15],[side*.7,-.35,-.2],[side*.38,-.9,-.1]],.2),skin,0,0,0,fin);
  }
 }
 if(profile.species==='human'){
  mesh(new THREE.CapsuleGeometry(.3,.33,4,12).scale(1,1, .86),suit,0,1.04,0);
  box(0,1.08,.27,.4,.35,.07,white);box(0,1.13,.315,.18,.07,.035,glow);
  box(0,1.05,-.32,.38,.55,.22,dark);
  ball(.36,skin,0,1.69,0);ball(.31,dark,0,1.7,.22,[1,.72,.52]);eyes([-.12,.12],1.71,.37,.055);
  mesh(new THREE.TorusGeometry(.23,.065,8,16).rotateX(Math.PI/2),suit,0,1.4,0);
 }else if(profile.species==='crystal'){
  mesh(new THREE.OctahedronGeometry(.49).scale(.95,1.35,.8),skin,0,1.08,0);
  mesh(new THREE.IcosahedronGeometry(.34,0),skin,0,1.78,0);
  for(const side of [-1,1]){mesh(new THREE.ConeGeometry(.15,.55,4).rotateZ(-side*.4),glow,side*.34,1.99,-.02);mesh(new THREE.OctahedronGeometry(.19),skin,side*.37,1.38,0)}
  eyes([-.15,0,.15],1.8,.27,.06);
 }else if(profile.species==='mycelian'){
  mesh(new THREE.CylinderGeometry(.18,.29,.95,12),white,0,1.08,0);
  mesh(new THREE.SphereGeometry(.76,20,10,0,Math.PI*2,0,Math.PI/2).scale(1,.55,1),skin,0,1.73,0);
  mesh(new THREE.CylinderGeometry(.73,.73,.04,20),dark,0,1.73,0);eyes([-.1,.1],1.49,.21);
  for(let i=0;i<7;i++)ball(.07,glow,Math.cos(i*2.4)*.48,1.97,Math.sin(i*2.4)*.43,[1,.5,1]);
 }else if(profile.species==='orbion'){
  ball(.65,skin,0,1.36,0,[1,1,.88]);
  mesh(new THREE.TorusGeometry(.83,.04,6,40).rotateX(Math.PI/2+.18),glow,0,1.3,0);
  eyes([-.25,0,.25],1.6,.53,.1);
  for(let i=0;i<4;i++){
   const angle=i*Math.PI/2,limb=joint('orbit-tentacle-'+i,Math.cos(angle)*.39,.91,Math.sin(angle)*.32);limb.userData.tentacle=i;
   mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(),new THREE.Vector3(Math.cos(angle)*.15,-.25,Math.sin(angle)*.15),new THREE.Vector3(Math.cos(angle)*.27,-.48,Math.sin(angle)*.3)]),10,.065,6,false),skin,0,0,0,limb);
  }
 }else{
  mesh(new THREE.CapsuleGeometry(.19,.9,3,10).scale(.9,1.2,.7),skin,0,1.3,0);ball(.24,skin,0,2.15,0,[.9,1.25,.75]);
  eyes([-.1,.1],2.08,.17,.055);eyes([-.1,.1],2.24,.17,.055);
  mesh(ribbon([[0,0,0],[-.19,.2,0],[.13,.45,-.12],[.25,.19,-.08]],.18),glow,0,2.28,-.05);
 }
 if(profile.accessory!=='none'){
  const top=new THREE.Box3().setFromObject(model).max.y;
  if(profile.accessory==='halo')mesh(new THREE.TorusGeometry(.37,.035,6,32).rotateX(Math.PI/2),glow,0,top+.16,0);
  else{mesh(new THREE.CylinderGeometry(.38,.38,.06,16),suit,0,top+.05,0);mesh(new THREE.CylinderGeometry(.24,.24,.3,16),suit,0,top+.22,0)}
 }
 return model;
}

// Hash vertex/index bytes, not labels, colors or time-dependent pose transforms.
export function heroGeometry(model:THREE.Object3D){
 let hash=2166136261,meshes=0,vertices=0,triangles=0;
 const bytes=(array:ArrayBufferView)=>{const a=new Uint8Array(array.buffer,array.byteOffset,array.byteLength);for(const b of a){hash^=b;hash=Math.imul(hash,16777619)}};
 const visit=(node:THREE.Object3D)=>{if(!node.visible)return;if(node instanceof THREE.Mesh){meshes++;const position=node.geometry.getAttribute('position');vertices+=position.count;triangles+=(node.geometry.index?.count??position.count)/3;bytes(position.array);if(node.geometry.index)bytes(node.geometry.index.array)}for(const child of node.children)visit(child)};
 visit(model);return {species:model.userData.heroSpecies as SpeciesId,signature:(hash>>>0).toString(16).padStart(8,'0'),meshes,vertices,triangles};
}

export function replaceHero(state:GameState,player:THREE.Group,patch:Partial<HeroProfile>={},prepare?:(model:THREE.Group)=>void,protectedMaterials:THREE.Material[]=[]){
 const profile={...state.hero,...patch},candidate=createHeroModel(profile);
 try{validateModel(candidate);prepare?.(candidate)}catch(error){disposeGroup(candidate);throw error}
 const previous=[...player.children];player.add(candidate);for(const child of previous)disposeGroup(child,protectedMaterials);
 state.hero=profile;return candidate;
}
