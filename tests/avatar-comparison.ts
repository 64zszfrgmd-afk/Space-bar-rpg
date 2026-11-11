import * as THREE from 'three';
import {createHeroModel,heroGeometry} from '../src/world/hero';
import {disposeGroup} from '../src/world/aliens';
import {freshState} from '../src/game/storage';
import type {SpeciesId} from '../src/game/types';

// Evidence fixture only: constant world scale, camera and lights for every kind.
// The separate production UI test verifies the actual in-game camera and input.
const renderer=new THREE.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});renderer.setSize(390,600);renderer.setPixelRatio(1);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;document.body.append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#19152d');
scene.add(new THREE.HemisphereLight('#b1a4ff','#5c355b',2));const light=new THREE.DirectionalLight('#ffe3b1',3);light.position.set(2,8,4);scene.add(light);
const camera=new THREE.PerspectiveCamera(62,390/600,.1,150);camera.position.set(0,4.3,6);camera.lookAt(0,1.1,0);camera.updateMatrixWorld();
let model:THREE.Group|null=null;
Object.assign(window,{avatarComparison:(id:SpeciesId,view:'rear'|'side')=>{
 if(model)disposeGroup(model);model=createHeroModel({...freshState().hero,species:id});model.rotation.y=view==='rear'?Math.PI:Math.PI/2;scene.add(model);renderer.render(scene,camera);
 const pixels=new Uint8Array(390*600*4);renderer.getContext().readPixels(0,0,390,600,renderer.getContext().RGBA,renderer.getContext().UNSIGNED_BYTE,pixels);
 let minX=390,maxX=0,minY=600,maxY=0,count=0;const mask:number[]=[];
 for(let i=0;i<pixels.length;i+=4){const on=Math.abs(pixels[i]-pixels[0])+Math.abs(pixels[i+1]-pixels[1])+Math.abs(pixels[i+2]-pixels[2])>20;mask.push(on?1:0);if(on){const x=i/4%390,y=Math.floor(i/4/390);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);count++}}
 return {id,view,geometry:heroGeometry(model),mask,pixels:count,width:maxX-minX+1,height:maxY-minY+1,png:renderer.domElement.toDataURL(),camera:{position:camera.position.toArray(),fov:camera.fov,aspect:camera.aspect},worldScale:model.scale.toArray()};
}});
