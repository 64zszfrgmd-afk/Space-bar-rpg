import {travelAccess,hasPass,docksOpen} from '../game/access';
import {Dialog} from './dialog';
import type {NpcDefinition} from '../game/content';
import {questDefinitions} from '../game/content';
import {venues,venueById,species,localJobs,worldItems} from '../game/world-data';
import {storyHints,advanceStory,type StoryAction} from '../game/story';
import {acceptJob,claimJob,deliverJob,canTravel,addJobProgress} from '../game/world';
import {socialOffer} from '../game/profile';
import {meet} from '../game/social';
import type {GameState,VenueId,Quality} from '../game/types';
import type {HeroProfile} from '../world/hero';
interface Hooks {state:()=>GameState;dialog:Dialog;close:()=>void;menu:()=>void;talk:(n:NpcDefinition)=>void;changed:(message:string)=>void;go:(id:VenueId)=>boolean;approach:(id:NpcDefinition['id'])=>void;hero:(patch:Partial<HeroProfile>)=>boolean;heroPreview:()=>HTMLCanvasElement;quality:()=>void;rhythm:()=>void;onFloor:()=>boolean}
export class HistoryUI {
 constructor(private h:Hooks){}
 private back(){this.h.dialog.choice('Назад в меню',this.h.menu,false,'menu-back')}
 npc(n:NpcDefinition){
  const s=this.h.state(),d=this.h.dialog;
  d.text(`Настроение собеседника: ${Math.round(s.npcMoods[n.id]??50)}/100`);
  const story=(label:string,action:StoryAction,text:string)=>d.choice(label,()=>{if(advanceStory(s,action)){if(n.id==='lyra')meet(s,'lyra');this.h.changed(text)}this.h.talk(n)},false,'story-'+action);
  if(n.id==='borks'&&s.story===0)story('Куда делся мой корабль?','borks','Боркс: «Ты заключил сделку с цивилизацией складных стульев. Они обещали не складывать корабль. Зип всё видел».');
  if(n.id==='zip'&&s.story===1)story('Ты видел вчерашнюю сделку?','witness','Зип: «Твой пропуск танцевал лучше тебя. А Лира знала, чем всё закончится. Спроси её у окна».');
  if(n.id==='lyra'&&s.story===2)story('Лира? Зип отправил меня к тебе.','lyra','Лира: «Корабль на месте. Исчезла лишь твоя уверенность. Хочешь расшифровать подсказку?»');
  if(n.id==='lyra'&&s.story===3)story('Что означает сделка и где пропуск?','clue','Лира: «Там, где отдыхала твоя спина, отдыхает и пропуск. Или спроси Миру-7: она умеет восстанавливать цифровые копии».');
  if(n.id==='mira'&&s.story===4)d.choice('Восстановить цифровой пропуск',()=>{d.show('Мира-7 · проверка личности','Что не становится меньше, если поделиться с другом?');d.choice('Радость',()=>{advanceStory(s,'digital');this.h.changed('Мира-7: «Ответ принят. Пропуск восстановлен. Идите к выходу за DJ-пультом».');this.h.talk(n)},false,'digital-answer');d.choice('Мой неоплаченный счёт',()=>{this.h.changed('Мира-7: «Хорошая попытка. Попробуем более дружелюбный ответ».');this.h.talk(n)});d.choice('Вернуться к разговору',()=>this.h.talk(n))},false,'digital-pass');
  for(const job of localJobs){const q=s.jobs[job.id];
   if(job.owner===n.id){
    if(q.status==='new')d.choice(`Задание «${job.name}» · ${job.reward} ◈`,()=>{d.show(job.name,job.description);d.choice('Берусь!',()=>{if(acceptJob(s,job.id))this.h.changed('Задание принято: '+job.name);this.h.talk(n)},s.story!==6,'job-accept-'+job.id);d.choice('Пока не готов',()=>this.h.talk(n))},false,'job-'+job.id);
    else if(q.status==='active')d.text(`${job.name}: ${Math.floor(q.progress)}/${job.target}. ${job.description}`);
    else if(q.status==='ready')d.choice(`Завершить «${job.name}» · +${job.reward} ◈`,()=>{if(claimJob(s,job.id,n.id))this.h.changed('Задание выполнено. Репутация +3!');this.h.talk(n)},false,'job-claim-'+job.id);
   }
   if(job.deliverTo===n.id&&q.status==='active')d.choice('Передать: '+job.name,()=>{if(deliverJob(s,job.id,n.id))this.h.changed('Доставка принята. Вернись к заказчику за наградой.');this.h.talk(n)},false,'job-deliver-'+job.id);
  }
  if(s.met.includes(n.id))for(const kind of ['dance','flirt'] as const)d.choice(kind==='dance'?'Пригласить на танец':'Флиртовать',()=>{const result=socialOffer(s,n.id,kind,n.preference??(n.id==='zip'?'music':'quiet'),n.flirtable);this.h.changed(result.text);this.h.talk(n)},false,'offer-'+kind);
  if(s.buzz>=60)d.choice('Спросить, почему гравитация сегодня косая',()=>{d.show(n.name,'Гравитация: «Я сегодня вообще-то по расписанию». Собеседник тактично предлагает воды.');d.choice('Пожалуй, возьму воды',()=>this.h.talk(n))});
 }
 addMenu(){const d=this.h.dialog,s=this.h.state();d.text(`${s.hero.name} · ${species.find(x=>x.id===s.hero.species)!.name} · репутация ${s.reputation}/100`);d.choice('Карта планет и заведений',()=>this.map(),false,'map');d.choice('Герой: вид, имя и аксессуары',()=>this.appearance(),false,'appearance');d.choice('Журнал заданий и инвентарь',()=>this.journal(),false,'journal');d.choice('Звук и качество графики',()=>this.settings(),false,'settings');d.choice('Ритм-игра · восемь ударов',this.h.rhythm,!this.h.onFloor(), 'rhythm-start');d.text('Для ритм-игры подойди на светящийся танцпол. Онлайн пока не реализован.');}
 map(){const d=this.h.dialog,s=this.h.state();d.show('Карта путешественника',docksOpen(s)?'Доки открыты. Все маршруты бесплатны.':hasPass(s)?'Пропуск есть, осталось предъявить его.':'Пропуска пока нет. '+storyHints[s.story]);
  if(hasPass(s)&&!docksOpen(s))d.choice('Предъявить пропуск и открыть доки',()=>{if(advanceStory(s,'exit'))this.h.changed('Пропуск принят, доки открыты. Награда выдаётся один раз.');this.map()},false,'validate-pass');
  if(!hasPass(s)&&!docksOpen(s)){const helper=(['borks','zip','lyra','lyra','mira'] as const)[Math.min(s.story,4)];d.choice('Подойти к тому, кто поможет с пропуском',()=>this.h.approach(helper),false,'pass-help')}
  for(const v of venues){const access=travelAccess(s,v.id);const b=d.choice(`${s.venue===v.id?'● ':s.visited.includes(v.id)?'✓ ':''}${v.planet} · ${v.name}\n${access.allowed?v.description:'Проверить ограничение: '+access.message}`,()=>{this.h.go(v.id)},false,'travel-'+v.id);b.dataset.locked=String(!access.allowed)}this.back();
 }
 journal(){const d=this.h.dialog,s=this.h.state();d.show('Журнал путешественника','Текущая локация: '+venueById(s.venue).name);d.text(`Куда делся мой корабль? ${s.story===6?'✓ завершено':'Этап '+(s.story+1)+'/6'}\n${storyHints[s.story]}`);
  for(const id of ['party','syrup'] as const)d.text(`${questDefinitions[id].name}: ${this.status(s.quests[id])}`);
  for(const job of localJobs){const q=s.jobs[job.id];d.text(`${job.name}: ${this.status(q.status)} · ${Math.floor(q.progress)}/${job.target}\n${job.description}`)}
  d.text('Инвентарь: '+(s.inventory.map(id=>id==='station-pass'?'Пропуск станции':id.startsWith('parcel:')?'Посылка: '+localJobs.find(q=>q.id===id.slice(7))?.name:worldItems.find(i=>i.id===id)?.name??'Памятная находка').join(', ')||'пусто'));d.text(`Знакомства: ${s.met.length}. Посещено мест: ${s.visited.length}/${venues.length}. Лучший ритм: ${s.rhythm.best}/800.`);this.back();
 }
 private status(value:string){return ({new:'не взято',active:'в процессе',ready:'вернись за наградой',done:'✓ выполнено'} as Record<string,string>)[value]}
 appearance(){const d=this.h.dialog,s=this.h.state();d.show('Твой герой',`${s.hero.name} · ${species.find(x=>x.id===s.hero.species)!.name}. Вид меняет 3D-модель; прогресс остаётся общим.`);
  const preview=this.h.heroPreview();preview.setAttribute('aria-label','Внешность героя: '+species.find(x=>x.id===s.hero.species)!.name);d.element(preview);
  for(const sp of species)d.choice(`${s.hero.species===sp.id?'✓ ':''}${sp.name}\n${sp.description}`,()=>{if(this.h.hero({species:sp.id})){this.h.changed('Внешность изменена: '+sp.name);this.appearance()}else d.notice('Модель не обновилась. Прежний вид и прогресс сохранены.')},false,'species-'+sp.id);
  for(const [i,title] of ['Орбитальный шаг','Лунный шаффл','Волна щупалец'].entries())d.choice((s.hero.dance===i?'✓ ':'')+title,()=>{s.hero.dance=i as 0|1|2;this.h.changed('Танцевальное движение сохранено.');this.appearance()},false,'dance-style-'+i);
  const name=d.field('Имя путешественника',s.hero.name),color=d.field('Цвет',s.hero.color,'color');
  d.choice('Сохранить имя и цвет',()=>{if(this.h.hero({name:name.value.trim().slice(0,24)||'Путешественник',color:/^#[0-9a-f]{6}$/i.test(color.value)?color.value:s.hero.color})){this.h.changed('Герой сохранён.');this.appearance()}else d.notice('Не удалось обновить модель. Прежняя внешность сохранена.')},false,'hero-save');
  for(const [id,title] of [['none','Без аксессуара'],['halo','Орбитальный нимб'],['hat','Космическая шляпа']] as const)d.choice(title,()=>{if(this.h.hero({accessory:id})){this.h.changed('Аксессуар изменён.');this.appearance()}else d.notice('Не удалось обновить модель. Прежняя внешность сохранена.')},false,'accessory-'+id);this.back();
  preview.scrollIntoView({block:'nearest'});
 }
 settings(){const d=this.h.dialog,s=this.h.state();d.show('Настройки','Качество меняет разрешение 3D. Музыка включается отдельной кнопкой после нажатия.');
  for(const [id,title] of [['auto','Автоматически'],['low','Экономное'],['balanced','Среднее'],['high','Высокое']] as [Quality,string][])d.choice(`${s.settings.quality===id?'✓ ':''}${title}`,()=>{s.settings.quality=id;this.h.quality();this.h.changed('Настройка графики сохранена.');this.settings()},false,'quality-'+id);
  const volume=d.field('Громкость музыки',String(s.settings.volume),'range');volume.min='0';volume.max='1';volume.step='.05';d.choice('Сохранить громкость',()=>{s.settings.volume=Number(volume.value);this.h.changed('Громкость сохранена.');this.settings()},false,'volume-save');this.back();
 }
 terminal(){const d=this.h.dialog,s=this.h.state();d.show('Звёздный терминал','Что остаётся нашим и становится больше, если отдать это другу?');for(const [answer,correct] of [['Радость',true],['Счёт за парковку',false],['Расстояние до дома',false]] as const)d.choice(answer,()=>{if(correct&&s.venue==='echo'&&addJobProgress(s,'stars',1))this.h.changed('Терминал доволен. Вернись к Илю.');else this.h.changed(correct?'Сначала возьми задание у Иля.':'Звёзды дружно подмигнули: попробуй ещё раз.');this.h.close()},false,correct?'stars-answer':'stars-wrong');d.choice('Отойти',this.h.close)}
}
