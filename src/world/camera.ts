import * as THREE from 'three';
// Fit the actual room, rather than a landscape camera cropped by a portrait viewport.
export function overviewCamera(aspect:number):THREE.PerspectiveCamera {
 const camera=new THREE.PerspectiveCamera(85,aspect,.1,150),center=new THREE.Vector3(0,2,0),direction=new THREE.Vector3(0,.65,.76).normalize(),up=new THREE.Vector3(0,direction.z,-direction.y);
 const tanV=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),tanH=tanV*aspect;let distance=0;
 for(const x of [-11.2,11.2])for(const y of [-.4,10.2])for(const z of [-9.8,9.8]){const point=new THREE.Vector3(x,y,z).sub(center);distance=Math.max(distance,point.dot(direction)+Math.max(Math.abs(x)/tanH,Math.abs(point.dot(up))/tanV))}
 camera.position.copy(center).addScaledVector(direction,distance*1.04);camera.lookAt(center);camera.updateProjectionMatrix();camera.updateMatrixWorld();return camera;
}
export function modelIsVisible(root:THREE.Object3D):boolean {let attached=false;for(let node:THREE.Object3D|null=root;node;node=node.parent){if(!node.visible)return false;if(node instanceof THREE.Scene)attached=true}return attached}
export function validateModel(root:THREE.Object3D):number {
 let meshes=0;root.traverse(node=>{if(node instanceof THREE.Mesh){const positions=node.geometry.getAttribute('position');if(!positions||positions.count===0)throw Error('У модели нет вершин');meshes++}});
 const bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3());
 if(!meshes||![...bounds.min.toArray(),...bounds.max.toArray()].every(Number.isFinite)||size.length()<.1)throw Error('Пустая или повреждённая 3D-модель');return meshes;
}
