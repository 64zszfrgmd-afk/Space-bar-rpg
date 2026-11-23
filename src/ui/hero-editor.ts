import type {GameState} from '../game/types';
import {species} from '../game/world-data';
import type {HeroProfile} from '../world/hero';
import {Dialog} from './dialog';

type Tab='character'|'dances'|'appearance';
interface EditorHooks {
 state:()=>GameState;dialog:Dialog;menu:()=>void;hero:(patch:Partial<HeroProfile>)=>boolean;
 heroPreview:()=>HTMLCanvasElement;changed:(text:string)=>void;dance:()=>boolean;
}
export const danceNames=['Орбитальный шаг','Лунный шаффл','Волна щупалец'] as const;

// Tabs are UI state only. The saved hero profile and numeric dance IDs stay unchanged.
export class HeroEditor {
 private active:Tab='character';
 private name:string;
 private color:string;
 private panel=document.createElement('section');
 private tabs=new Map<Tab,HTMLButtonElement>();
 constructor(private h:EditorHooks){this.name=h.state().hero.name;this.color=h.state().hero.color}
 show(){
  const d=this.h.dialog;d.show('Твой герой','Персонаж, танцы и внешность');d.panel('appearance');
  const tablist=document.createElement('div');tablist.className='editor-tabs';tablist.setAttribute('role','tablist');tablist.setAttribute('aria-label','Редактор героя');
  for(const [id,label] of [['character','Персонаж'],['dances','Танцы'],['appearance','Внешность']] as const){
   const b=document.createElement('button');b.type='button';b.textContent=label;b.id='hero-tab-'+id;b.dataset.action='hero-tab-'+id;b.setAttribute('role','tab');b.setAttribute('aria-controls','hero-tab-panel');
   b.onclick=()=>this.activate(id);tablist.append(b);this.tabs.set(id,b);
  }
  tablist.addEventListener('keydown',e=>{
   const ids=[...this.tabs.keys()],index=ids.indexOf(this.active);
   const next=e.key==='Home'?0:e.key==='End'?2:e.key==='ArrowRight'?(index+1)%3:e.key==='ArrowLeft'?(index+2)%3:null;
   if(next!==null){e.preventDefault();this.activate(ids[next]);this.tabs.get(ids[next])!.focus({preventScroll:true})}
  });
  d.element(tablist);this.panel.id='hero-tab-panel';this.panel.className='editor-panel';this.panel.setAttribute('role','tabpanel');d.element(this.panel);
  d.choice('Назад в меню',this.h.menu,false,'menu-back');this.activate('character');this.tabs.get('character')!.focus({preventScroll:true});
 }
 private activate(tab:Tab){
  this.active=tab;for(const [id,b] of this.tabs){b.setAttribute('aria-selected',String(id===tab));b.tabIndex=id===tab?0:-1}
  this.panel.setAttribute('aria-labelledby','hero-tab-'+tab);this.panel.dataset.editorTab=tab;this.panel.replaceChildren();
  this.panel.parentElement?.querySelector('[data-notice]')?.remove();
  if(tab==='character')this.character();else if(tab==='dances')this.dances();else this.appearance();
  this.panel.closest('.modal-body')!.scrollTop=0;
 }
 private text(text:string){const p=document.createElement('p');p.textContent=text;this.panel.append(p)}
 private choice(label:string,action:()=>void,id:string){const b=this.h.dialog.choice(label,action,false,id);this.panel.append(b);return b}
 private character(){
  const s=this.h.state(),picker=document.createElement('div');picker.className='species-picker';picker.setAttribute('role','group');picker.setAttribute('aria-label','Выбор вида героя');this.panel.append(picker);
  for(const sp of species){const b=this.choice((s.hero.species===sp.id?'✓ ':'')+sp.name,()=>{
   if(this.h.hero({species:sp.id})){this.h.changed('Внешность изменена: '+sp.name);this.activate('character')}
   else this.h.dialog.notice('Модель не обновилась. Прежний вид и прогресс сохранены. Открой диагностику в меню.');
  },'species-'+sp.id);b.setAttribute('aria-pressed',String(s.hero.species===sp.id));picker.append(b)}
  const preview=this.h.heroPreview();preview.setAttribute('aria-label','Внешность героя: '+species.find(sp=>sp.id===s.hero.species)!.name);this.panel.append(preview);
  this.text(species.find(sp=>sp.id===s.hero.species)!.description);
 }
 private dances(){
  const s=this.h.state();this.text('Выбор сохраняется. Исполнение — на танцполе.');
  const picker=document.createElement('div');picker.className='dance-picker';picker.setAttribute('role','group');picker.setAttribute('aria-label','Танцевальные движения');this.panel.append(picker);
  for(const [id,title] of danceNames.entries()){
   const b=this.choice((s.hero.dance===id?'✓ ':'')+title,()=>{this.h.state().hero.dance=id as 0|1|2;this.h.changed('Танцевальное движение сохранено: '+title);this.activate('dances')},'dance-style-'+id);b.setAttribute('aria-pressed',String(s.hero.dance===id));picker.append(b);
  }
  this.choice('Исполнить танец',()=>{if(!this.h.dance())this.h.dialog.notice('Подойди на светящийся танцпол и встань с сиденья. Выбранное движение уже сохранено.')},'editor-dance').classList.add('primary');
 }
 private appearance(){
  const d=this.h.dialog;
  const name=d.field('Имя путешественника',this.name);this.panel.append(name.parentElement!);name.id='hero-name';name.addEventListener('input',()=>this.name=name.value);
  const color=d.field('Цвет',this.color,'color');this.panel.append(color.parentElement!);color.id='hero-color';color.addEventListener('input',()=>this.color=color.value);
  this.choice('Сохранить имя и цвет',()=>{
   const s=this.h.state();if(this.h.hero({name:this.name.trim().slice(0,24)||'Путешественник',color:/^#[0-9a-f]{6}$/i.test(this.color)?this.color:s.hero.color})){
    this.name=this.h.state().hero.name;this.color=this.h.state().hero.color;this.h.changed('Герой сохранён.');this.activate('appearance');
   }else d.notice('Не удалось обновить модель. Прежняя внешность сохранена.');
  },'hero-save');
  this.text('Аксессуары сохраняются отдельно от имени и цвета.');
  for(const [id,label] of [['none','Без аксессуара'],['halo','Орбитальный нимб'],['hat','Космическая шляпа']] as const){
   const b=this.choice((this.h.state().hero.accessory===id?'✓ ':'')+label,()=>{
    if(this.h.hero({accessory:id})){this.h.changed('Аксессуар изменён.');this.activate('appearance')}else d.notice('Не удалось обновить модель. Прежняя внешность сохранена.');
   },'accessory-'+id);b.setAttribute('aria-pressed',String(this.h.state().hero.accessory===id));
  }
 }
}
