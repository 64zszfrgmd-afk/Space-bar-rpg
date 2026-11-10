export interface FlowEvent {time:string;stage:string;code:string;message:string}
export class UserFlow {
 events:FlowEvent[]=[];target='';stage='startup';code='STARTUP';message='Запуск';lastInput='нет';lastClick='нет';lastCancel='нет';lastTravelPointer='нет';lastTravelClick='нет';selectedNpc='';
 record(stage:string,code:string,message:string){this.stage=stage;this.code=code;this.message=message;this.events.push({time:new Date().toISOString(),stage,code,message});this.events=this.events.slice(-50)}
 snapshot(){return {target:this.target,stage:this.stage,code:this.code,message:this.message,lastInput:this.lastInput,lastClick:this.lastClick,lastCancel:this.lastCancel,lastTravelPointer:this.lastTravelPointer,lastTravelClick:this.lastTravelClick,selectedNpc:this.selectedNpc,events:this.events.map(v=>({...v}))}}
}
