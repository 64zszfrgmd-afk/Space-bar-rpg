import * as THREE from 'three';
import type {VenueId} from '../game/types';
import type {Room} from './venue';
import {WorldDiagnostics} from './diagnostics';
export class WorldRouter {
 current:Room|null=null;id:VenueId|null=null;requested:VenueId|null=null;status:'loading'|'ready'|'error'='loading';presentations=0;
 constructor(private scene:THREE.Scene,private original:Room,private actors:Map<VenueId,THREE.Group>,private build:(id:VenueId)=>Room,private dispose:(group:THREE.Group)=>void,private diagnostics:WorldDiagnostics){}
 load(id:VenueId,present:(room:Room)=>void):Room|null {
  this.requested=id;this.status='loading';let candidate:Room|null=null;const previous=this.current,previousId=this.id;
  const actorsBefore=new Map([...this.actors].map(([key,group])=>[key,group.visible]));
  try{
   candidate=id==='nebula'?this.original:this.build(id);
   if(candidate.group===previous?.group&&id!=='nebula')throw Error('Следующая локация повторно использует старое окружение');
   let meshes=0;candidate.group.traverse(node=>{if(node instanceof THREE.Mesh)meshes++});
   if(meshes<10||candidate.seats.length===0)throw Error('Окружение не содержит мебели и доступных сидений');
   candidate.group.name='venue-environment:'+id;candidate.group.userData.venueId=id;
   this.scene.add(candidate.group);this.original.group.visible=id==='nebula';if(previous&&previous!==candidate)previous.group.visible=false;candidate.group.visible=true;
   for(const [key,group] of this.actors)group.visible=key===id;
   // A real render must succeed before changing the game location or disposing its old scene.
   present(candidate);
   this.current=candidate;this.id=id;this.status='ready';this.presentations++;
   if(previous&&previous!==candidate&&previous!==this.original){try{this.dispose(previous.group)}catch(error){this.diagnostics.report('LOCATION_CLEANUP_FAILED',previousId??'unknown',error)}}
   return candidate;
  }catch(error){
   if(candidate&&candidate!==previous&&candidate!==this.original)this.dispose(candidate.group);
   this.original.group.visible=previousId==='nebula'||previous===null;
   if(previous)previous.group.visible=true;
   for(const [key,visible] of actorsBefore)this.actors.get(key)!.visible=visible;
   this.status='error';this.diagnostics.report('LOCATION_LOAD_FAILED',id,error);return null;
  }
 }
}
