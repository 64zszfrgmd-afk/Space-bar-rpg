import type * as THREE from 'three';
import type {SpeciesId} from '../game/types';
import {heroGeometry} from './hero';

export type AvatarBuildStatus='idle'|'building'|'geometry-ready'|'preview-ready'|'presenting'|'ready'|'failed';
interface AvatarEvent {time:string;stage:string;requestedSpecies?:string;selectedSpecies?:string;renderedSpecies?:string;signature?:string;error?:string}
export class AvatarDiagnostics {
 status:AvatarBuildStatus='idle';lastError:{time:string;stage:string;message:string}|null=null;
 private presented:{uuid:string;species:SpeciesId;signature:string}|null=null;
 private events:AvatarEvent[]=[];
 record(stage:string,details:Omit<AvatarEvent,'time'|'stage'>={}){this.events.push({time:new Date().toISOString(),stage,...details});this.events=this.events.slice(-80)}
 begin(selected:SpeciesId,requested:SpeciesId){this.status='building';this.record('requested',{selectedSpecies:selected,requestedSpecies:requested})}
 stage(status:AvatarBuildStatus){this.status=status;this.record(status)}
 observe(model:THREE.Object3D){if(this.presented?.uuid===model.uuid)return;const geometry=heroGeometry(model);this.presented={uuid:model.uuid,species:geometry.species,signature:geometry.signature};this.record('main-scene-drawn',{renderedSpecies:geometry.species,signature:geometry.signature})}
 fail(stage:string,error:unknown){const message=(error instanceof Error?error.message:String(error)).slice(0,600);this.lastError={time:new Date().toISOString(),stage,message};this.status='failed';this.record('failed',{error:stage+': '+message})}
 snapshot(selectedSpecies:SpeciesId,model:THREE.Object3D|undefined,cameraMode:string,visible:boolean){
  const geometry=model?heroGeometry(model):null;
  return {selectedSpecies,renderedSpecies:model&&this.presented?.uuid===model.uuid?this.presented.species:null,
   attachedSpecies:geometry?.species??null,avatarBuildStatus:this.status,avatarMeshCount:geometry?.meshes??0,
   avatarGeometrySignature:geometry?.signature??null,cameraMode,avatarVisible:visible&&(model?.userData.avatarFrame?.pixels??1)>0,
   avatarFrame:model?.userData.avatarFrame?structuredClone(model.userData.avatarFrame):null,
   avatarModelCount:model?.parent?.children.length??0,lastAvatarError:this.lastError?{...this.lastError}:null,
   avatarHistory:this.events.map(e=>({...e}))};
 }
}
