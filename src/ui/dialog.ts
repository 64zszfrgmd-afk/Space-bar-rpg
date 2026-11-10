export class Dialog {
  private epoch=0;
  private previous:HTMLElement|null=null;
  get isOpen(){return !this.shade.classList.contains('hidden')}
  constructor(private shade:HTMLElement,private content:HTMLElement,private reset:()=>void){
    document.getElementById('dialog-dismiss')?.addEventListener('click',()=>this.close());
    shade.addEventListener('click',e=>{if(e.target===shade)this.close()});
    shade.addEventListener('keydown',e=>{if(e.code!=='Tab')return;e.preventDefault();const buttons=[...shade.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)')],i=buttons.indexOf(document.activeElement as HTMLElement);buttons[(i+(e.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus()});
  }
  show(title:string,text:string){if(!this.isOpen)this.previous=document.activeElement as HTMLElement;this.epoch++;this.reset();this.shade.classList.remove('hidden');this.content.replaceChildren();this.content.scrollTop=0;const h=document.createElement('h2');h.id='dialog-title';h.textContent=title;this.content.append(h);this.text(text)}
  text(text:string){const p=document.createElement('p');p.textContent=text;this.content.append(p)}
  element(node:HTMLElement){this.content.append(node)}
  choice(text:string,action:()=>void,disabled=false,id?:string){const epoch=this.epoch,b=document.createElement('button');b.textContent=text;b.disabled=disabled;if(id)b.dataset.action=id;b.addEventListener('click',async()=>{if(epoch!==this.epoch||b.disabled)return;b.disabled=true;try{await action()}catch(error){window.dispatchEvent(new CustomEvent('spacebar:ui-error',{detail:{action:id??text,message:error instanceof Error?error.message:String(error)}}))}finally{if(epoch===this.epoch&&b.isConnected)b.disabled=disabled}});this.content.append(b);if(this.content.querySelector('button:not(:disabled)')===b)b.focus({preventScroll:true});return b}
  notice(text:string){let p=this.content.querySelector<HTMLElement>('[data-notice]');if(!p){p=document.createElement('p');p.dataset.notice='true';p.setAttribute('role','alert');this.content.prepend(p)}p.textContent=text;p.scrollIntoView({block:'nearest'})}
  field(label:string,value:string,type='text'){const l=document.createElement('label'),input=document.createElement('input');l.textContent=label;input.type=type;input.value=value;if(type==='text')input.maxLength=24;l.append(input);this.content.append(l);return input}
  close(){this.epoch++;this.shade.classList.add('hidden');this.reset();window.dispatchEvent(new Event('spacebar:dialog-closed'));if(this.previous?.isConnected)this.previous.focus({preventScroll:true})}
}
