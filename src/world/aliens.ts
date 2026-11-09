import * as THREE from 'three';
import type {SpeciesId} from '../game/types';
export function alien(species:SpeciesId,color:string,accessory:'none'|'halo'|'hat'='none'):THREE.Group{
 const g=new THREE.Group(),skin=new THREE.MeshStandardMaterial({color,roughness:.6}),dark=new THREE.MeshStandardMaterial({color:'#27243c'}),light=new THREE.MeshStandardMaterial({color:'#fff2d7'}),glow=new THREE.MeshStandardMaterial({color:'#aafbf4',emissive:'#54b3bc',emissiveIntensity:.4});
 const add=(geometry:THREE.BufferGeometry,material:THREE.Material,x:number,y:number,z:number,parent:THREE.Object3D=g)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);parent.add(mesh);return mesh};
 const ball=(r:number,m:THREE.Material,x:number,y:number,z:number)=>add(new THREE.SphereGeometry(r,12,8),m,x,y,z);
 const eye=(x:number,y:number,z:number,r=.08)=>{ball(r,light,x,y,z);ball(r*.48,dark,x,y,z+r*.78)};
 // Named limbs preserve gait and seating across every playable species.
 for(const side of [-1,1]){
  const leg=add(new THREE.BoxGeometry(.15,.48,.2),dark,side*.18,.3,0);leg.name=side<0?'leg-left':'leg-right';
  const arm=add(new THREE.CapsuleGeometry(.075,.4,2,8),skin,side*.43,1,0);arm.name=side<0?'arm-left':'arm-right';arm.rotation.z=side*.18;
  if(species==='orbion')leg.visible=false;
 }
 if(species==='crystal'){
  const body=add(new THREE.OctahedronGeometry(.48),skin,0,1,0);body.scale.y=1.2;add(new THREE.IcosahedronGeometry(.36,0),skin,0,1.7,0);
  for(const side of [-1,1]){const shard=add(new THREE.ConeGeometry(.13,.5,4),glow,side*.38,1.95,0);shard.rotation.z=-side*.4}for(const x of [-.15,0,.15])eye(x,1.75,.28,.065);
 }else if(species==='mycelian'){
  const body=ball(.35,skin,0,1,0);body.scale.y=1.4;ball(.29,light,0,1.65,0);const cap=ball(.46,skin,0,1.91,0);cap.scale.y=.45;
  for(const side of [-1,1]){const antenna=add(new THREE.CylinderGeometry(.025,.035,.3,6),skin,side*.27,2.15,0);antenna.rotation.z=-side*.3;ball(.075,glow,side*.32,2.3,0);eye(side*.12,1.68,.25)}
  for(let i=0;i<5;i++)ball(.045,glow,Math.sin(i*2)*.28,1.98,Math.cos(i*2)*.27);
 }else if(species==='orbion'){
  const body=ball(.48,skin,0,1.35,0);body.scale.y=1.15;
  const ring=add(new THREE.TorusGeometry(.64,.045,6,32),glow,0,1.35,0);ring.rotation.x=Math.PI/2+.25;ring.name='orbit-ring';
  for(const x of [-.22,0,.22])eye(x,1.55+(x===0?.15:0),.4,.09);
  for(let i=0;i<6;i++){const tentacle=add(new THREE.ConeGeometry(.07,.6,6),skin,Math.sin(i*Math.PI/3)*.3,.67,Math.cos(i*Math.PI/3)*.25);tentacle.rotation.z=Math.sin(i)*.25+Math.PI;tentacle.name='tentacle-'+i}
 }else if(species==='ribbon'){
  const body=ball(.32,skin,0,1.05,0);body.scale.set(.9,1.8,.65);ball(.3,skin,0,1.75,0);
  for(const side of [-1,1]){const fin=add(new THREE.ConeGeometry(.28,.85,3),glow,side*.48,1.12,-.08);fin.rotation.z=side*.8;fin.scale.z=.12;fin.name='fin-'+side;for(const y of [1.68,1.85])eye(side*.12,y,.24,.055)}
  const crest=add(new THREE.TorusGeometry(.34,.035,6,24,Math.PI),glow,0,1.9,-.04);crest.rotation.z=.2;
 }else{
  add(new THREE.CylinderGeometry(.28,.4,.65,12),new THREE.MeshStandardMaterial({color:'#e1af63'}),0,.95,0);ball(.34,skin,0,1.55,0);for(const side of [-1,1])eye(side*.13,1.6,.29);
 }
 if(accessory==='halo'){const halo=add(new THREE.TorusGeometry(.36,.035,6,32),glow,0,2.5,0);halo.rotation.x=Math.PI/2}
 if(accessory==='hat'){const hat=new THREE.MeshStandardMaterial({color:'#f6bf77'});add(new THREE.CylinderGeometry(.38,.38,.06,16),hat,0,2.34,0);add(new THREE.CylinderGeometry(.25,.25,.3,16),hat,0,2.5,0)}
 return g;
}
export function disposeGroup(root:THREE.Object3D,protectedMaterials:THREE.Material[]=[]){
 const geometry=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
 root.traverse(node=>{if(node instanceof THREE.Mesh){geometry.add(node.geometry);for(const m of Array.isArray(node.material)?node.material:[node.material])if(!protectedMaterials.includes(m))materials.add(m)}});
 for(const m of materials){const map=(m as THREE.MeshStandardMaterial).map;if(map)textures.add(map);m.dispose()}for(const t of textures)t.dispose();for(const g of geometry)g.dispose();root.removeFromParent();
}
