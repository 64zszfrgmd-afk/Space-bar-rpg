import type {Point,Seat} from '../game/types';

export class Seating {
  private session:{seat:Seat;entry:Point}|null=null;
  constructor(readonly seats:readonly Seat[]){}
  get active():Seat|null{return this.session?.seat??null}
  sit(id:string,position:Point):Seat|null{
    const seat=this.seats.find(s=>s.id===id);
    if(this.session||!seat||!Number.isFinite(position.x)||!Number.isFinite(position.z)||Math.hypot(seat.x-position.x,seat.z-position.z)>=2.3)return null;
    this.session={seat,entry:{x:position.x,z:position.z}};return seat;
  }
  stand(free:(x:number,z:number)=>boolean):Point|null{
    if(!this.session)return null;
    const {seat,entry}=this.session,candidates=[entry,...seat.exits];
    for(const radius of [1.1,1.7,2.3])for(let i=0;i<16;i++)candidates.push({x:seat.x+Math.cos(i*Math.PI/8)*radius,z:seat.z+Math.sin(i*Math.PI/8)*radius});
    const position=candidates.find(p=>free(p.x,p.z));if(!position)return null;
    this.session=null;return {...position};
  }
}
