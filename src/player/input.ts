export class Input {
  keys=new Set<string>(); side=0; forward=0; running=false;
  private captures=new Map<HTMLElement,number>();
  constructor(canvas:HTMLElement,joy:HTMLElement,stick:HTMLElement,run:HTMLElement,blocked:()=>boolean,look:(dx:number,dy:number)=>void,action:(code:string)=>void,tap?:(x:number,y:number)=>void){
    let tapStart:{id:number;x:number;y:number}|null=null;
    const release=(element:HTMLElement)=>{const id=this.captures.get(element);this.captures.delete(element);if(id!==undefined&&element.hasPointerCapture(id))element.releasePointerCapture(id);if(element===joy){this.side=0;this.forward=0;stick.style.transform=''}if(element===run){this.running=false;run.classList.remove('active')}};
    this.reset=()=>{tapStart=null;this.keys.clear();for(const element of [...this.captures.keys()])release(element)};
    addEventListener('keydown',e=>{if(blocked()){if(e.code==='Escape')action(e.code);return}if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab'].includes(e.code))e.preventDefault();this.keys.add(e.code);if(!e.repeat)action(e.code)});
    addEventListener('keyup',e=>this.keys.delete(e.code));
    const attach=(element:HTMLElement,update:(e:PointerEvent,first:boolean)=>void)=>{
      element.addEventListener('pointerdown',e=>{if(blocked()||this.captures.has(element)||e.button>0)return;e.preventDefault();this.captures.set(element,e.pointerId);element.setPointerCapture(e.pointerId);update(e,true)});
      element.addEventListener('pointermove',e=>{if(this.captures.get(element)===e.pointerId)update(e,false)});
      for(const name of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(name,event=>{if(this.captures.get(element)===(event as PointerEvent).pointerId)release(element)});
    };
    attach(joy,e=>{const r=joy.getBoundingClientRect(),x=(e.clientX-r.left-r.width/2)/40,z=(e.clientY-r.top-r.height/2)/40,len=Math.max(1,Math.hypot(x,z));this.side=x/len;this.forward=z/len;stick.style.transform=`translate(${this.side*33}px,${this.forward*33}px)`});
    let lastX=0,lastY=0;
    attach(canvas,(e,first)=>{if(!first)look(e.clientX-lastX,e.clientY-lastY);lastX=e.clientX;lastY=e.clientY});
    canvas.addEventListener('pointerdown',e=>{if(!blocked()&&e.button===0)tapStart={id:e.pointerId,x:e.clientX,y:e.clientY}});
    canvas.addEventListener('pointerup',e=>{if(tapStart?.id===e.pointerId){const start=tapStart;tapStart=null;if(!blocked()&&Math.hypot(e.clientX-start.x,e.clientY-start.y)<10)tap?.(e.clientX,e.clientY)}});
    canvas.addEventListener('pointercancel',()=>tapStart=null);
    attach(run,()=>{this.running=true;run.classList.add('active')});
    addEventListener('blur',()=>this.reset());document.addEventListener('visibilitychange',()=>{if(document.hidden)this.reset()});addEventListener('pagehide',()=>this.reset());
  }
  reset:()=>void=()=>{};
  axes(){return {side:this.side+(this.keys.has('KeyD')||this.keys.has('ArrowRight')?1:0)-(this.keys.has('KeyA')||this.keys.has('ArrowLeft')?1:0),forward:this.forward+(this.keys.has('KeyS')||this.keys.has('ArrowDown')?1:0)-(this.keys.has('KeyW')||this.keys.has('ArrowUp')?1:0),running:this.running||this.keys.has('ShiftLeft')||this.keys.has('ShiftRight')}}
}
