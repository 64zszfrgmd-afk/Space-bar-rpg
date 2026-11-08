export class Dialog {
  private epoch=0;
  private previous:HTMLElement|null=null;
  get isOpen(){return !this.shade.classList.contains('hidden')}
  constructor(private shade:HTMLElement,private content:HTMLElement,private reset:()=>void){
    shade.addEventListener('click',e=>{if(e.target===shade)this.close()});
    shade.addEventListener('keydown',e=>{if(e.code!=='Tab')return;e.preventDefault();const buttons=[...content.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled)')],i=buttons.indexOf(document.activeElement as HTMLElement);buttons[(i+(e.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus()});
  }
  show(title:string,text:string){if(!this.isOpen)this.previous=document.activeElement as HTMLElement;this.epoch++;this.reset();this.shade.classList.remove('hidden');this.content.replaceChildren();this.content.scrollTop=0;const h=document.createElement('h2');h.id='dialog-title';h.textContent=title;this.content.append(h);this.text(text)}
  text(text:string){const p=document.createElement('p');p.textContent=text;this.content.append(p)}
  choice(text:string,action:()=>void,disabled=false,id?:string){const epoch=this.epoch,b=document.createElement('button');b.textContent=text;b.disabled=disabled;if(id)b.dataset.action=id;b.addEventListener('click',()=>{if(epoch===this.epoch&&!b.disabled){b.disabled=true;action()}});this.content.append(b);if(this.content.querySelector('button:not(:disabled)')===b)b.focus({preventScroll:true});return b}
  field(label:string,value:string,type='text'){const l=document.createElement('label'),input=document.createElement('input');l.textContent=label;input.type=type;input.value=value;if(type==='text')input.maxLength=24;l.append(input);this.content.append(l);return input}
  close(){this.epoch++;this.shade.classList.add('hidden');this.reset();if(this.previous?.isConnected)this.previous.focus({preventScroll:true})}
}
