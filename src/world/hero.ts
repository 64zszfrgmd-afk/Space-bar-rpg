import * as THREE from 'three';
import type {GameState,SpeciesId} from '../game/types';
import {SPECIES_IDS} from '../game/types';
import {disposeGroup} from './aliens';
import {validateModel} from './camera';

export type HeroProfile=GameState['hero'];

function ribbon(points:number[][],width:number){
 const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p as [number,number,number]))),samples=path.getPoints(16),positions:number[]=[],indices:number[]=[];
 samples.forEach((p,i)=>{
  const t=i/(samples.length-1),tangent=path.getTangent(t).normalize();
  const side=new THREE.Vector3().crossVectors(tangent,Math.abs(tangent.z)>.95?new THREE.Vector3(0,1,0):new THREE.Vector3(0,0,1)).normalize().applyAxisAngle(tangent,t*Math.PI*.8);
  const normal=new THREE.Vector3().crossVectors(tangent,side).normalize().multiplyScalar(.045),edge=side.multiplyScalar(width*(.35+.65*Math.sin(Math.PI*t))/2);
  for(const [a,b] of [[1,1],[-1,1],[-1,-1],[1,-1]])positions.push(...p.clone().addScaledVector(edge,a).addScaledVector(normal,b).toArray());
  if(i<samples.length-1)for(let k=0;k<4;k++){const a=i*4+k,b=i*4+(k+1)%4;indices.push(a,b,b+4,a,b+4,a+4)}
 });
 indices.push(0,2,1,0,3,2);const end=(samples.length-1)*4;indices.push(end,end+1,end+2,end,end+2,end+3);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

// This factory is exclusively for the player. Existing NPC geometry stays in aliens.ts.
export function createHeroModel(profile:HeroProfile):THREE.Group{
 if(!SPECIES_IDS.includes(profile.species))throw Error('Неизвестный вид героя: '+profile.species);
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
   mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(),new THREE.Vector3(side*.3,-.22,.15),new THREE.Vector3(side*.45,-.57,.3)]),10,.105,8,false),skin,0,0,0,leg);
   mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(),new THREE.Vector3(side*.36,-.15,-.15),new THREE.Vector3(side*.48,-.42,-.26)]),8,.08,8,false),glow,0,0,0,arm);
  }else{
   mesh(ribbon([[0,0,0],[side*.13,-.24,.26],[side*.3,-.51,-.18],[side*.17,-.71,.18]],.28),glow,0,0,0,leg);
   mesh(ribbon([[0,0,0],[side*.65,-.12,.35],[side*.85,-.55,-.3],[side*.35,-1.1,.22]],.38),glow,0,0,0,arm);
   const fin=joint('ribbon-fin-'+suffix,side*.2,1.93,-.12);fin.userData.flap=side;
   mesh(ribbon([[0,0,0],[side*.68,.18,-.45],[side*.98,-.35,-.7],[side*.48,-.92,-.38]],.4),skin,0,0,0,fin);
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
  ball(.73,skin,0,1.36,0,[1,1,.98]);
  mesh(new THREE.TorusGeometry(.93,.06,8,40).rotateX(Math.PI/2+.32),glow,0,1.3,0);
  eyes([-.27,0,.27],1.6,.63,.1);
  for(const side of [-1,0,1])ball(.11,glow,side*.32,1.68,-.62,[1,1,1.4]);
  for(let i=0;i<4;i++){
   const angle=i*Math.PI/2+Math.PI/4,limb=joint('orbit-tentacle-'+i,Math.cos(angle)*.45,.93,Math.sin(angle)*.45);limb.userData.tentacle=i;
   mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(),new THREE.Vector3(Math.cos(angle)*.26,-.23,Math.sin(angle)*.26),new THREE.Vector3(Math.cos(angle)*.54,-.62,Math.sin(angle)*.54)]),10,.1,8,false),skin,0,0,0,limb);
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

export function replaceHero(state:GameState,player:THREE.Group,patch:Partial<HeroProfile>={},prepare?:(model:THREE.Group)=>void,protectedMaterials:THREE.Material[]=[],present?:(model:THREE.Group)=>void){
 const profile={...state.hero,...patch},candidate=createHeroModel(profile);
 try{validateModel(candidate);prepare?.(candidate)}catch(error){disposeGroup(candidate);throw error}
 const previous=[...player.children],position=player.position.clone(),rotation=player.rotation.clone(),scale=player.scale.clone();
 for(const child of previous)child.removeFromParent();player.add(candidate);
 try{present?.(candidate)}catch(error){disposeGroup(candidate);for(const child of previous)player.add(child);player.position.copy(position);player.rotation.copy(rotation);player.scale.copy(scale);throw error}
 for(const child of previous)disposeGroup(child,protectedMaterials);
 state.hero=profile;return candidate;
}
