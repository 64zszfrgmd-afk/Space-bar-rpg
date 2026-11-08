import * as THREE from 'three';
export function createBorks(){
  const group=new THREE.Group(),skin=new THREE.MeshStandardMaterial({color:'#91dcba',roughness:.65}),dark=new THREE.MeshStandardMaterial({color:'#30233e'}),gold=new THREE.MeshStandardMaterial({color:'#ffbb66'}),white=new THREE.MeshStandardMaterial({color:'#fff5dc'});
  const sphere=(r:number,m:THREE.Material,x:number,y:number,z:number,parent:THREE.Object3D=group)=>{const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,12,10),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh};
  const body=sphere(.48,skin,0,1.05,0);body.scale.set(1,1.4,.8);const apron=new THREE.Mesh(new THREE.BoxGeometry(.62,.66,.18),dark);apron.position.set(0,.96,.35);group.add(apron);sphere(.07,gold,0,1.22,.46);const head=sphere(.39,skin,0,1.85,0);head.scale.x=1.18;
  for(const side of [-1,1]){const eye=sphere(.13,white,side*.19,1.94,.3);eye.scale.y=1.1;sphere(.055,dark,side*.19,1.94,.405);sphere(.18,skin,side*.44,1.89,0).scale.set(1.4,.65,.6);const foot=sphere(.18,dark,side*.2,.16,.09);foot.scale.set(1,1,1.5)}
  const mouth=new THREE.Mesh(new THREE.TorusGeometry(.14,.025,6,16,Math.PI),dark);mouth.rotation.z=Math.PI;mouth.position.set(0,1.72,.36);group.add(mouth);
  const arms:THREE.Group[]=[];
  for(const side of [-1,1])for(let row=0;row<3;row++){
    const pivot=new THREE.Group();pivot.name=`borks-arm-${side}-${row}`;pivot.position.set(side*.38,1.5-row*.29,0);pivot.rotation.z=side*(.55+row*.22);
    const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.085,.42,3,8),skin);arm.position.set(side*.3,0,0);arm.rotation.z=Math.PI/2;pivot.add(arm);sphere(.12,skin,side*.6,0,.04,pivot);group.add(pivot);arms.push(pivot);
  }
  // A tray and a shaker, held by two of the six independently animated arms.
  const tray=new THREE.Mesh(new THREE.CylinderGeometry(.24,.24,.035,16),gold);tray.position.set(-.6,.03,.04);arms[0].add(tray);
  const shaker=new THREE.Mesh(new THREE.CylinderGeometry(.07,.11,.26,12),white);shaker.position.set(.61,.12,.04);arms[3].add(shaker);
  return {mesh:group,arms,animate:(time:number,talking:boolean)=>{group.position.y=Math.sin(time*1.6)*.025;arms.forEach((arm,i)=>{const side=i<3?-1:1,row=i%3;arm.rotation.z=side*(.55+row*.22)+Math.sin(time*(talking?5:2)+i)*.13;arm.rotation.x=Math.sin(time*2+i)*.2})}};
}
