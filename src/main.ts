import * as THREE from 'three';
import './style.css';
import {VERSION} from './game/types';
import type {Drink,NpcId} from './game/types';
import {npcDefinitions,questDefinitions} from './game/content';
import {loadGame,saveGame,advanceStats} from './game/storage';
import {borksDrinks,bipDrinks,purchaseDrink,effects} from './game/drinks';
import {relation,meet,greet,treat,claimGift,currentDay,friendshipTitle} from './game/social';
import {acceptQuest,claimQuest,collectSyrup,deliverSyrup,checkQuests,progressQuest} from './game/quests';
import {Seating} from './player/seating';
import {movePlayer} from './player/movement';
import {Input} from './player/input';
import {Dialog} from './ui/dialog';
import {createBorks} from './world/borks';
import {createSeating,posePlayer} from './world/seats';


const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `<div id="scene"></div><div class="hud"><div class="hud-head"><div class="top"><div class="brand"><small>SPACE BAR RPG / 0.20 · СЕКТОР 07</small><h1>Пьяная туманность<span style="color:#e7b568"> ✦</span></h1><p>Путешественник · Бар на краю Вселенной</p></div><div class="stats"><div class="stat"><span>КРЕДИТЫ</span><b id="credits"></b></div><div class="stat"><span>ЭНЕРГИЯ</span><b id="energy"></b><i><em id="energybar"></em></i></div><div class="stat"><span>НАСТРОЕНИЕ</span><b id="mood"></b><i><em id="moodbar"></em></i></div><div class="stat"><span>ОПЬЯНЕНИЕ</span><b id="buzz"></b><i><em id="buzzbar"></em></i></div></div></div><p id="quest" class="quest"></p></div><div class="bottom"><div class="help"><span class="legend">W A S D / стрелки</span> — движение · <span class="legend">E</span> — общение<br>Перетаскивание — обзор · <span class="legend">V</span> — камера · <span class="legend">T</span> — танец · Shift — бег · Esc — меню</div><div class="actions"><button id="sound" class="sound">♫ Музыка: выкл.</button><button id="camera">◉ От первого лица</button><button id="dance">✦ Танцевать</button><button id="menu">☰ Меню</button></div></div></div><div class="touch" id="joystick" aria-label="Джойстик движения"><div id="stick"></div></div><button id="run" class="touch" aria-label="Бег: удерживай во время движения">Бег ⇧</button><div class="crosshair hidden" id="crosshair"></div><button class="primary hidden" id="interact"></button><div id="toast" style="opacity:0" role="status"></div><div class="modal-shade hidden" id="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div class="modal" id="dialog-content"></div></div>`;
const el = (id:string) => document.getElementById(id)!;
const scene = new THREE.Scene(); scene.background = new THREE.Color('#100e29'); scene.fog = new THREE.FogExp2('#16112c', .022);
const mobileRenderer=matchMedia('(pointer: coarse)').matches||navigator.maxTouchPoints>0;
const renderRatio=()=>Math.min(devicePixelRatio||1,mobileRenderer?1.25:1.7);
let renderer: THREE.WebGLRenderer;
try { renderer = new THREE.WebGLRenderer({antialias:!mobileRenderer, powerPreference:mobileRenderer?'default':'high-performance'}); }
catch { window.dispatchEvent(new CustomEvent('spacebar:error',{detail:'Не удалось запустить 3D. Для этой сборки нужен WebGL 2. Откройте HTTPS-ссылку в обновлённом Safari; если сбой повторяется, закройте другие вкладки и перезагрузите страницу.'})); throw new Error('WebGL unavailable'); }
renderer.setPixelRatio(renderRatio()); renderer.setSize(innerWidth,innerHeight); renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.3;
el('scene').appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.1,150);
scene.add(new THREE.HemisphereLight('#b1a4ff','#5c355b',2));
const keyLight=new THREE.DirectionalLight('#ffe3b1',3); keyLight.position.set(2,8,4);scene.add(keyLight);
const mat=(color:string,emissive?:string)=>new THREE.MeshStandardMaterial({color,roughness:.7,...(emissive?{emissive,emissiveIntensity:2}:{})});
const materials={floor:mat('#332d50'),wall:mat('#29213d'),wood:mat('#9d5870'),dark:mat('#29243d'),gold:mat('#edae68'),cyan:mat('#69e9e0','#2ebbb5'),pink:mat('#f989cf','#c74cab')};
function box(w:number,h:number,d:number,m:THREE.Material,x=0,y=0,z=0,parent:THREE.Object3D=scene){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
function sphere(r:number,m:THREE.Material,x:number,y:number,z:number,parent:THREE.Object3D=scene){const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,16,12),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
function cylinder(rt:number,rb:number,h:number,m:THREE.Material,x:number,y:number,z:number,parent:THREE.Object3D=scene){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,24),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
function label(text:string,x:number,y:number,z:number,size=1,color='#95fff0'){const c=document.createElement('canvas');c.width=1024;c.height=160;const ctx=c.getContext('2d')!;ctx.font='bold 72px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=15;ctx.fillText(text,512,80);const tex=new THREE.CanvasTexture(c);const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));s.position.set(x,y,z);s.scale.set(size*6.4,size,1);scene.add(s);return s;}
// An open-front dollhouse keeps the third-person camera clear of walls.
box(22,.35,19,materials.floor,0,-.2,0);box(22,6,.4,materials.wall,0,3,-9.5);box(.4,6,19,materials.wall,-11,3,0);box(.4,6,19,materials.wall,11,3,0);
for(let x=-10;x<=10;x+=2)box(.025,.01,19,mat('#65517b'),x,.001,0);
for(let z=-9;z<=9;z+=2)box(22,.01,.025,mat('#65517b'),0,.002,z);
box(21,.07,.08,materials.cyan,0,.1,-9.15);box(.08,.07,18,materials.pink,-10.7,.1,0);box(.08,.07,18,materials.cyan,10.7,.1,0);
// Panoramic viewport and a tiny galaxy beyond it.
box(9,3.7,.08,mat('#080d27'),4,3.3,-9.24);box(9.3,.1,.13,materials.gold,4,5.2,-9.12);box(9.3,.1,.13,materials.gold,4,1.4,-9.12);
const rng=(seed=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;})(72);
for(let i=0;i<100;i++)sphere(.015+rng()*.025,materials.cyan,-.3+rng()*8.6,1.6+rng()*3.4,-9.12);
const planet=sphere(.95,mat('#b787c9'),5.8,3.5,-9);const ring=new THREE.Mesh(new THREE.TorusGeometry(1.45,.07,8,60),materials.gold);ring.position.copy(planet.position);ring.rotation.set(1.1,.2,.3);scene.add(ring);
// Counter, shelves, bottles, stools.
box(8,1.3,1.5,materials.wood,-5.2,.65,-5.4);box(8.4,.18,1.8,materials.gold,-5.2,1.38,-5.4);box(7.8,.08,.05,materials.pink,-5.2,.8,-4.61);
for(let row=0;row<2;row++){box(7,.14,.65,materials.wood,-5.4,2.2+row*1.1,-8.7);for(let i=0;i<12;i++){const bm=mat(['#66d8ae','#c782e5','#f4b15e','#71b9e8'][i%4]);cylinder(.09,.12,.4,bm,-8.5+i*.56,2.48+row*1.1,-8.65);cylinder(.045,.045,.14,bm,-8.5+i*.56,2.75+row*1.1,-8.65);}}
label('ПЬЯНАЯ ТУМАННОСТЬ',-5.2,4.8,-9.05,.8,'#ffc88a');
for(let i=0;i<4;i++){cylinder(.37,.37,.16,materials.wood,-8+i*1.9,.8,-3.7);cylinder(.07,.07,.7,materials.gold,-8+i*1.9,.4,-3.7);cylinder(.32,.4,.08,materials.dark,-8+i*1.9,.04,-3.7);}
const obstacles:{x:number;z:number;w:number;d:number}[]=[{x:-5.2,z:-6.6,w:8.8,d:4}];
for(const [x,z] of [[-6,3.5],[6,-3],[7,5]]){cylinder(1,1,.18,materials.wood,x,1.05,z);cylinder(.13,.2,1,materials.gold,x,.5,z);obstacles.push({x,z,w:2.25,d:2.25});for(let i=0;i<2;i++){cylinder(.32,.32,.55,materials.dark,x+(i?1.5:-1.5),.28,z);cylinder(.1,.13,.36,materials.cyan,x+(i?.35:-.35),1.32,z);}}
// Dance floor and DJ console.
const tiles:THREE.Mesh[]=[];for(let x=0;x<4;x++)for(let z=0;z<4;z++)tiles.push(box(.94,.05,.94,mat((x+z)%2?'#7754ad':'#3e999a'),-.5+x,.04,2+z));
box(4,.8,.8,materials.dark,1, .4,6.5);box(3.6,.06,.65,materials.pink,1,.85,6.5);label('ZERO GRAVITY DISCO',1,3,8,.48,'#fc9ede');
for(const x of [-1.7,3.7]){box(.7,1.7,.7,materials.dark,x,.85,6.6);for(let i=0;i<2;i++){const speaker=cylinder(.22,.22,.08,mat('#78718e'),x,.5+i*.65,6.18);speaker.rotation.x=Math.PI/2;}}
for(const [x,z] of [[-9,7],[9,-7],[9,8]]){cylinder(.4,.3,.6,materials.wood,x,.3,z);for(let j=0;j<5;j++){const leaf=sphere(.3,mat('#58cbb0'),x+Math.sin(j*2)*.3,.9+j*.18,z+Math.cos(j*2)*.3);leaf.scale.y=2;}}
for(const x of [-7,0,7]){cylinder(.04,.04,1.5,materials.dark,x,5.2,0);sphere(.3,materials.gold,x,4.4,0);const l=new THREE.PointLight('#ffb27d',12,9,2);l.position.set(x,4,0);scene.add(l);}
function character(color:string,kind:number){const g=new THREE.Group();const skin=mat(color);cylinder(.28,.4,.65,mat(kind===0?'#e1af63':'#5c587e'),0,.95,0,g);sphere(.34,skin,0,1.55,0,g);for(const side of [-1,1]){sphere(.085,mat('#fff3db'),side*.13,1.6,.29,g);sphere(.04,mat('#171329'),side*.13,1.6,.365,g);const leg=box(.16,.48,.2,materials.dark,side*.18,.3,0,g);leg.name=side<0?'leg-left':'leg-right';const arm=box(.14,.6,.16,skin,side*.43,1,0,g);arm.name=side<0?'arm-left':'arm-right';arm.rotation.z=side*.17;}if(kind===1){for(const s of [-1,1]){cylinder(.035,.035,.4,skin,s*.2,1.94,0,g);sphere(.09,materials.pink,s*.2,2.15,0,g);}}if(kind===2){sphere(.2,skin,-.4,1.6,0,g);sphere(.2,skin,.4,1.6,0,g);}if(kind===3){const crown=box(.5,.14,.45,materials.gold,0,1.92,0,g);crown.rotation.z=.15;}scene.add(g);return g;}
const player=character('#f2c19e',0);player.position.set(0,0,-.5);
const borks=createBorks();
const npcs=npcDefinitions.map(n=>({...n,mesh:n.id==='borks'?borks.mesh:character(n.color,n.kind)}));
npcs.forEach(n=>{if(n.id==='borks')scene.add(n.mesh);if(n.id==='zip')n.mesh.scale.setScalar(.76);n.mesh.position.set(n.x,0,n.z);n.mesh.rotation.y=n.id==='borks'||n.id==='bip'?0:n.x<0?1:-1;label(n.name,n.x,n.id==='zip'?2.1:2.65,n.z,.28,'#ffe4ba')});
const seats=createSeating(scene,obstacles),seating=new Seating(seats);
const syrup={x:-9,z:-1.5};box(.7,.7,.7,materials.wood,syrup.x,.35,syrup.z);box(.74,.1,.74,materials.cyan,syrup.x,.7,syrup.z);label('СИРОП',syrup.x,1.25,syrup.z,.22);
// All storage access is guarded, including the getter (Safari private/storage policy).
const storage={getItem:(key:string)=>localStorage.getItem(key),setItem:(key:string,value:string)=>localStorage.setItem(key,value)};
let state=loadGame(storage),firstPerson=false,dancing=false,yaw=0,pitch=.2,activeNpc:NpcId|null=null;
let toastTimer=0;
function toast(text:string){el('toast').textContent=text;el('toast').style.opacity='1';clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>el('toast').style.opacity='0',3500)}
function save(notify=false){const ok=saveGame(storage,state);if(notify)toast(ok?'Прогресс сохранён на этом устройстве.':'Хранилище недоступно. Прогресс сохранится только до закрытия вкладки.');return ok}
function hud(){
  el('credits').textContent=`◈ ${state.credits}`;
  for(const key of ['energy','mood','buzz'] as const){el(key).textContent=`${Math.round(state[key])}${key==='buzz'?'%':' / 100'}`;el(key+'bar').style.width=state[key]+'%'}
  const id=(['party','syrup'] as const).find(id=>['active','ready'].includes(state.quests[id]));
  el('quest').textContent=id?`${questDefinitions[id].name}: ${state.quests[id]==='ready'?'вернись к Зипу за наградой':progressQuest(state,id)}`:state.quests.party==='new'?'Задание: найди Зипа слева от танцпола.':state.quests.syrup==='new'?'Зип приготовил новое поручение.':'Задания Зипа выполнены. Наслаждайся вечером!';
}
let input:Input;
const dialog=new Dialog(el('dialog'),el('dialog-content'),()=>input?.reset());
const closeDialog=()=>{activeNpc=null;dialog.close()};
function finishAction(message:string,n?:typeof npcs[number]){checkQuests(state);save();hud();toast(message);if(n)talk(n)}
function talk(n:typeof npcs[number]){
  activeNpc=n.id;greet(state,n.id);checkQuests(state);save();hud();
  dialog.show(n.name,n.lines[state.met.includes(n.id)?1:0]);
  const r=relation(state,n.id);dialog.text(`Отношения: ${friendshipTitle(r.points)} · ${r.points}/9`);
  if(!state.met.includes(n.id))dialog.choice('Познакомиться · +10 настроения',()=>{meet(state,n.id);finishAction('Новое знакомство: '+n.name,n)},false,'meet');
  else{
    dialog.choice('Угостить безалкогольным чаем · 10 ◈ · +2 дружбы',()=>{if(treat(state,n.id))finishAction('Спасибо за чай! Друг оценил внимание.',n);else talk(n)},state.credits<10||r.treatDay===currentDay(state),'treat');
    if(r.points>=6){dialog.choice('Послушать личную историю',()=>{dialog.show(n.name,n.story);dialog.choice('Продолжить разговор',()=>talk(n));dialog.choice('До встречи ↗',closeDialog)});if(!r.gift)dialog.choice('Принять дружескую открытку · +25 ◈',()=>{if(claimGift(state,n.id))finishAction('Открытка оказалась денежным переводом. Космическая дружба!',n)},false,'gift')}
  }
  if(n.id==='zip')for(const id of ['party','syrup'] as const){
    const q=questDefinitions[id],status=state.quests[id];
    if(status==='new'&&(id==='party'||state.quests.party==='done'))dialog.choice(`Взять задание «${q.name}» · награда ${q.reward} ◈`,()=>{dialog.show(q.name,q.brief);dialog.choice('Берусь!',()=>{acceptQuest(state,id);finishAction('Задание добавлено в журнал.',n)},false,'accept-'+id);dialog.choice('Пока не готов',()=>talk(n))},false,'quest-'+id);
    else if(status==='active'||status==='ready'){dialog.text(`${q.name}: ${progressQuest(state,id)}`);if(status==='ready')dialog.choice(`Завершить «${q.name}» · +${q.reward} ◈`,()=>{if(claimQuest(state,id))finishAction('Задание выполнено! Зип доволен вечеринкой.',n)},false,'claim-'+id)}
  }
  if(n.id==='borks'&&state.quests.syrup==='active'&&state.syrupStage===1)dialog.choice('Передать звёздный сироп',()=>{if(deliverSyrup(state))finishAction('Боркс принял сироп всеми шестью руками. Вернись к Зипу.',n)},false,'deliver');
  if(n.id==='borks'||n.id==='bip'){
    dialog.text(n.id==='borks'?'Меню Боркса · 7 напитков. Вода бесплатная.':'Классические рецепты Бипа · прежние цены и эффекты.');
    for(const drink of n.id==='borks'?borksDrinks:bipDrinks)dialog.choice(`${drink.name} · ${drink.price} ◈\n${effects(drink)}${drink.alcoholic?'':' · без алкоголя'}`,()=>confirmDrink(n,drink),state.credits<drink.price,'drink-'+drink.id);
  }
  dialog.choice('До встречи ↗',closeDialog);
}
function confirmDrink(n:typeof npcs[number],drink:Drink){
  dialog.show('Подтвердить покупку',`${drink.name} · ${drink.price} ◈\n${drink.description}\n${effects(drink)}\nБаланс: ${state.credits} ◈ → ${state.credits-drink.price} ◈`);
  dialog.choice('Подтвердить · '+drink.price+' ◈',()=>{
    if(Math.hypot(n.x-player.position.x,n.z-player.position.z)>=n.reach){closeDialog();toast('Подойди к стойке, чтобы получить напиток.');return}
    const next=purchaseDrink(state,drink);if(!next){talk(n);toast('Недостаточно кредитов. Бесплатная вода всегда доступна.');return}
    state=next;finishAction(`Получено: ${drink.name}. ${effects(drink)}`,n);
  },state.credits<drink.price,'confirm-purchase');
  dialog.choice('Отмена — вернуться в меню',()=>talk(n),false,'cancel-purchase');
}
function menu(){activeNpc=null;dialog.show('Пьяная туманность · 0.20','Пауза. Восстановленная версия на основе 0.1.0. Прогресс сохраняется автоматически на этом устройстве.');dialog.choice('Продолжить игру',closeDialog,false,'resume');dialog.choice('Сохранить сейчас',()=>{save(true);menu()},false,'save');dialog.choice('Загрузить сохранение',()=>{state=loadGame(storage);checkQuests(state);hud();closeDialog();toast('Сохранённый прогресс загружен.');},false,'load');dialog.text('WASD / стрелки — ходьба · Shift — бег · перетаскивание — обзор · E — действие / встать · V — камера · F или T — танец · Esc — меню. На телефоне: джойстик слева, обзор справа; удерживай «Бег» во время движения. Для заданий алкоголь не нужен.');dialog.text('Онлайн пока не реализован. Safari требует WebGL 2; ресурсы встроены в сборку, внешние CDN не используются.');}
function toggleCamera(){firstPerson=!firstPerson;player.visible=!firstPerson;el('camera').textContent=firstPerson?'◉ От третьего лица':'◉ От первого лица';el('crosshair').classList.toggle('hidden',!firstPerson)}
function onFloor(){return player.position.x>-1.2&&player.position.x<3.5&&player.position.z>1.3&&player.position.z<5.7}
function setDance(value:boolean){dancing=value;el('dance').textContent=value?'■ Закончить танец':'✦ Танцевать'}
function dance(){if(dialog.isOpen)return;if(seating.active){toast('Сначала встань с места: кнопка «Встать» или E.');return}if(!onFloor()){toast('Танцпол — светящиеся плитки возле DJ. Подойди ближе!');return}setDance(!dancing);toast(dancing?'Пусть галактика подождёт. Ты танцуешь!':'Неплохие движения, землянин.')}
function canMove(x:number,z:number){return x>-10.3&&x<10.3&&z>-8.7&&z<8.7&&!obstacles.some(o=>Math.abs(x-o.x)<o.w/2+.3&&Math.abs(z-o.z)<o.d/2+.3)&&!npcs.some(n=>Math.hypot(x-n.x,z-n.z)<.75)}
type Interaction={distance:number;title:string;run:()=>void};
function nearest():Interaction|undefined{
  if(seating.active)return {distance:0,title:'Встать · E',run:()=>{const point=seating.stand(canMove);if(!point){toast('Выход занят. Попробуй ещё раз.');return}player.position.set(point.x,0,point.z);toast('Ты снова на ногах!')}};
  const options:Interaction[]=[];
  for(const n of npcs){const vendor=n.id==='borks'||n.id==='bip';if(Math.hypot(player.position.x-n.x,player.position.z-n.z)>=n.reach)continue;const distance=Math.hypot(player.position.x-n.x,player.position.z-(vendor?-4.4:n.z));options.push({distance,title:'Поговорить · '+n.name,run:()=>talk(n)})}
  for(const seat of seats){const distance=Math.hypot(player.position.x-seat.x,player.position.z-seat.z);if(distance<2.1)options.push({distance,title:'Сесть · '+seat.name,run:()=>{if(seating.sit(seat.id,player.position)){setDance(false);player.position.set(seat.x,0,seat.z);input.reset();toast('Отдых: энергия восстанавливается. E — встать.')}}})}
  if(state.quests.syrup==='active'&&state.syrupStage===0){const distance=Math.hypot(player.position.x-syrup.x,player.position.z-syrup.z);if(distance<1.8)options.push({distance,title:'Забрать звёздный сироп',run:()=>{if(collectSyrup(state))finishAction('Сироп найден. Передай его Борксу.')}})}
  return options.sort((a,b)=>a.distance-b.distance)[0];
}
function interact(){if(!dialog.isOpen)nearest()?.run()}
input=new Input(renderer.domElement,el('joystick'),el('stick'),el('run'),()=>dialog.isOpen||document.hidden,(dx,dy)=>{yaw-=dx*.005;pitch=THREE.MathUtils.clamp(pitch+dy*.004,-.6,.85)},code=>{if(code==='Escape'){if(dialog.isOpen)closeDialog();else menu()}if(dialog.isOpen)return;if(code==='KeyV')toggleCamera();if(['KeyT','KeyF','Space'].includes(code))dance();if(code==='KeyE')interact()});
el('camera').onclick=()=>{if(!dialog.isOpen)toggleCamera()};el('dance').onclick=dance;el('interact').onclick=interact;el('menu').onclick=menu;
// Small procedural synth preserved from 0.1.0: sound starts only after a gesture.
let audio:AudioContext|undefined,musicTimer:number|undefined;
el('sound').onclick=async()=>{try{if(musicTimer){clearInterval(musicTimer);musicTimer=undefined;await audio?.suspend();el('sound').textContent='♫ Музыка: выкл.';return}audio??=new AudioContext();await audio.resume();let beat=0;const notes=[130.81,164.81,196,246.94,220,196,164.81,146.83];musicTimer=window.setInterval(()=>{if(!audio||document.hidden||dialog.isOpen)return;const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.value=notes[beat++%notes.length];gain.gain.setValueAtTime(0,audio.currentTime);gain.gain.linearRampToValueAtTime(.055,audio.currentTime+.03);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.35);osc.connect(gain).connect(audio.destination);osc.start();osc.stop(audio.currentTime+.4)},260);el('sound').textContent='♫ Музыка: вкл.'}catch{toast('Браузер пока не разрешил звук. Попробуй ещё раз.')}};
const snapshot=()=>({version:VERSION,state:structuredClone(state),player:{x:player.position.x,z:player.position.z,y:player.position.y},firstPerson,camera:{yaw,pitch},dancing,seated:seating.active?.id??null,paused:dialog.isOpen,interaction:nearest()?.title});
Object.defineProperty(window,'spaceBar',{value:Object.freeze({version:VERSION,getSnapshot:snapshot}),writable:false});
// Mutating scene access is compiled out of production. Browser geometry tests opt in on dev only.
if(import.meta.env.DEV&&(window as unknown as {__SPACEBAR_TEST__?:boolean}).__SPACEBAR_TEST__)Object.assign(window,{spaceBarTest:{player,npcs,seats,obstacles,seating,canMove}});
let previous=performance.now(),elapsed=0,saveClock=0,started=false,hudClock=0;const desired=new THREE.Vector3(),target=new THREE.Vector3();
function frame(now:number){
  requestAnimationFrame(frame);const dt=Math.min(Math.max((now-previous)/1000,0),.05);previous=now;const paused=dialog.isOpen||document.hidden;const step=paused?0:dt;elapsed+=step;
  const axes=input.axes(),running=axes.running&&state.energy>1;let moved=0;
  if(!paused&&!seating.active){moved=movePlayer(player.position,axes.side,axes.forward,yaw,running?5.3:3.5,step,canMove);if(moved>.001){setDance(false);player.rotation.y=Math.atan2(axes.side*Math.cos(yaw)+axes.forward*Math.sin(yaw),-axes.side*Math.sin(yaw)+axes.forward*Math.cos(yaw))}}
  if(dancing&&!onFloor())setDance(false);
  if(!paused){advanceStats(state,step,{moving:moved>.001,running,dancing,seated:!!seating.active});if(dancing&&state.quests.party==='active'){state.partyDance=Math.min(15,state.partyDance+step);checkQuests(state)}}
  posePlayer(player,seating.active,elapsed,moved>.001,dancing);if(dancing&&!paused)player.rotation.y+=step*1.5;
  saveClock+=step;hudClock+=dt;if(saveClock>2){saveClock=0;save()}if(hudClock>.2){hudClock=0;hud()}
  const near=nearest();el('interact').classList.toggle('hidden',!near||dialog.isOpen);if(near)el('interact').textContent=near.title;
  const sway=Math.sin(elapsed*1.8)*state.buzz*.00035;
  if(firstPerson){camera.position.set(player.position.x,1.65*player.scale.y+player.position.y,player.position.z);camera.rotation.set(-pitch+sway,yaw,Math.sin(elapsed)*state.buzz*.0003,'YXZ')}
  else{target.set(player.position.x,1.1+player.position.y,player.position.z);desired.set(Math.sin(yaw)*6,3.2+pitch*4,Math.cos(yaw)*6).add(target);desired.x=THREE.MathUtils.clamp(desired.x,-10.4,10.4);desired.z=THREE.MathUtils.clamp(desired.z,-8.7,13);camera.position.lerp(desired,1-Math.exp(-dt*8));camera.lookAt(target)}
  tiles.forEach((tile,i)=>{const m=tile.material as THREE.MeshStandardMaterial;m.emissive.setHSL((elapsed*.06+i*.07)%1,.65,.25);m.emissiveIntensity=.6+Math.sin(elapsed*3+i)*.3});
  npcs.forEach((n,i)=>{if(n.id==='borks')return;n.mesh.position.y=Math.sin(elapsed*2+i)*.035;if(n.id==='zip'){n.mesh.rotation.z=Math.sin(elapsed*6)*.12;n.mesh.position.y+=Math.abs(Math.sin(elapsed*6))*.09}});borks.animate(elapsed,activeNpc==='borks'&&dialog.isOpen);
  renderer.render(scene,camera);if(!started){started=true;window.dispatchEvent(new Event('spacebar:ready'))}
}
camera.position.set(0,4.6,6);checkQuests(state);hud();requestAnimationFrame(frame);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(renderRatio())});
document.addEventListener('visibilitychange',()=>{previous=performance.now();if(document.hidden)save()});addEventListener('pagehide',()=>save());
renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();save();window.dispatchEvent(new CustomEvent('spacebar:error',{detail:'Safari остановил 3D-графику. Перезагрузите игру; если хранилище браузера доступно, прогресс восстановится из последнего сохранения.'}))});
toast('Добро пожаловать! Боркс — за стойкой, Зип — слева от танцпола.');
