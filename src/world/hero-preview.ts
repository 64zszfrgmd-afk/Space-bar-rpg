import * as THREE from 'three';
import {posePlayer} from './seats';
import {heroGeometry} from './hero';

// Reuse the game's WebGL context. The editor owns only a 2D snapshot, not a second renderer.
export function renderHeroPreview(renderer:THREE.WebGLRenderer,model:THREE.Group){
 if(renderer.getContext().isContextLost())throw Error('WebGL-контекст недоступен');
 const size=384,target=new THREE.WebGLRenderTarget(size,size,{depthBuffer:true,stencilBuffer:false}),previous=renderer.getRenderTarget();
 target.texture.colorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#19152d');
 const actor=new THREE.Group();actor.add(model.clone(true));posePlayer(actor,null,0,false,false);scene.add(actor);
 scene.add(new THREE.HemisphereLight('#d5d7ff','#553950',2.5));
 const light=new THREE.DirectionalLight('#fff0dc',3);light.position.set(3,5,5);scene.add(light);
 const box=new THREE.Box3().setFromObject(actor),center=box.getCenter(new THREE.Vector3()),radius=box.getBoundingSphere(new THREE.Sphere()).radius;
 const camera=new THREE.PerspectiveCamera(35,1,.01,100);
 camera.position.copy(center).addScaledVector(new THREE.Vector3(.3,.07,1).normalize(),radius/Math.sin(THREE.MathUtils.degToRad(17.5))*1.08);camera.lookAt(center);
 const pixels=new Uint8Array(size*size*4);
 try{renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,size,size,pixels)}
 finally{renderer.setRenderTarget(previous);target.dispose()}
 let visiblePixels=0;for(let i=0;i<pixels.length;i+=4)if(Math.abs(pixels[i]-pixels[0])+Math.abs(pixels[i+1]-pixels[1])+Math.abs(pixels[i+2]-pixels[2])>20)visiblePixels++;
 if(visiblePixels<500)throw Error('Предпросмотр модели не отрисован');
 const canvas=document.createElement('canvas');canvas.width=canvas.height=size;canvas.id='hero-preview';canvas.className='hero-preview';canvas.setAttribute('role','img');
 const ctx=canvas.getContext('2d')!;const image=ctx.createImageData(size,size);
 for(let y=0;y<size;y++)image.data.set(pixels.subarray((size-1-y)*size*4,(size-y)*size*4),y*size*4);
 ctx.putImageData(image,0,0);const geometry=heroGeometry(model);canvas.dataset.species=geometry.species;canvas.dataset.geometry=geometry.signature;canvas.dataset.pixels=String(visiblePixels);
 return canvas;
}
