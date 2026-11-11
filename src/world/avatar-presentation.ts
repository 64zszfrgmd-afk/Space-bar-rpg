import * as THREE from 'three';

// Measure the avatar's contribution to the real main framebuffer, using the
// existing camera, lights and scenery. Restrict readback to its projected bounds.
export function measureAvatarFrame(renderer:THREE.WebGLRenderer,scene:THREE.Scene,camera:THREE.Camera,model:THREE.Object3D){
 const gl=renderer.getContext(),box=new THREE.Box3().setFromObject(model),size=renderer.getDrawingBufferSize(new THREE.Vector2());
 let left=1,right=-1,bottom=1,top=-1;
 for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
  const p=new THREE.Vector3(x,y,z).project(camera);left=Math.min(left,p.x);right=Math.max(right,p.x);bottom=Math.min(bottom,p.y);top=Math.max(top,p.y);
 }
 const x=Math.max(0,Math.floor((left+1)*size.x/2)-2),y=Math.max(0,Math.floor((bottom+1)*size.y/2)-2);
 const width=Math.max(0,Math.min(size.x,Math.ceil((right+1)*size.x/2)+2)-x),height=Math.max(0,Math.min(size.y,Math.ceil((top+1)*size.y/2)+2)-y);
 if(!width||!height)return {pixels:0,pixelSignature:'outside-frame',rect:{x,y,width,height}};
 const visible=model.visible,withAvatar=new Uint8Array(width*height*4),withoutAvatar=new Uint8Array(withAvatar.length);
 try{
  renderer.render(scene,camera);gl.readPixels(x,y,width,height,gl.RGBA,gl.UNSIGNED_BYTE,withAvatar);
  model.visible=false;renderer.render(scene,camera);gl.readPixels(x,y,width,height,gl.RGBA,gl.UNSIGNED_BYTE,withoutAvatar);
 }finally{model.visible=visible;renderer.render(scene,camera)}
 let pixels=0,hash=2166136261;
 for(let i=0;i<withAvatar.length;i+=4){const changed=Math.abs(withAvatar[i]-withoutAvatar[i])+Math.abs(withAvatar[i+1]-withoutAvatar[i+1])+Math.abs(withAvatar[i+2]-withoutAvatar[i+2])>20;pixels+=Number(changed);hash=Math.imul(hash^Number(changed),16777619)}
 return {pixels,pixelSignature:(hash>>>0).toString(16).padStart(8,'0'),rect:{x,y,width,height}};
}
