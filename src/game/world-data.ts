import type {VenueId,JobId,NpcId,SpeciesId,Point} from './types';
import type {NpcDefinition} from './content';
export interface Venue {id:VenueId;name:string;planet:string;kind:'bar'|'club'|'cabin';theme:'station'|'ember'|'ocean'|'cloud';accent:string;wall:string;description:string}
export const venues:Venue[]=[
 {id:'nebula',name:'Пьяная туманность',planet:'Последняя остановка',kind:'bar',theme:'station',accent:'#7fe2d4',wall:'#29213d',description:'Тот самый бар. Боркс помнит вечеринку лучше, чем тебе хотелось бы.'},
 {id:'meridian',name:'Нулевой меридиан',planet:'Последняя остановка',kind:'club',theme:'station',accent:'#df89ff',wall:'#252044',description:'Орбитальный клуб, в котором часы разрешают себе отставать от музыки.'},
 {id:'rust',name:'Ржавый спутник',planet:'Карамель-9',kind:'bar',theme:'ember',accent:'#ffb55e',wall:'#572f42',description:'Уютный бар внутри старого буксира над оранжевыми дюнами.'},
 {id:'comet',name:'Комета навынос',planet:'Карамель-9',kind:'club',theme:'ember',accent:'#ff6c9b',wall:'#4b2642',description:'Ракетные сопла работают прожекторами. Доставка комет временно отменена.'},
 {id:'plankton',name:'Синий планктон',planet:'Нереида',kind:'bar',theme:'ocean',accent:'#62ffe2',wall:'#123e52',description:'Подводный купол, светящиеся кораллы и самый вежливый планктон в секторе.'},
 {id:'abyss',name:'Бездна 220',planet:'Нереида',kind:'club',theme:'ocean',accent:'#68b8ff',wall:'#162b53',description:'Глубоководный клуб с зоной тишины: басы слышат даже древние моллюски.'},
 {id:'orbit',name:'Тихая орбита',planet:'Люмен',kind:'bar',theme:'cloud',accent:'#ffe59b',wall:'#43416c',description:'Чайная на парящем острове. Облака приходят сюда отдохнуть от неба.'},
 {id:'echo',name:'Эхо пульсара',planet:'Люмен',kind:'club',theme:'cloud',accent:'#bc9aff',wall:'#35315f',description:'Кольцевой танцзал над облаками и обсерватория с чувством юмора.'},
 {id:'cabin',name:'Каюта путешественника',planet:'Последняя остановка',kind:'cabin',theme:'station',accent:'#e9bb7c',wall:'#302e48',description:'Кровать, иллюминатор, зеркало и право побыть единственным странным существом в комнате.'},
];
export const venueById=(id:VenueId)=>venues.find(v=>v.id===id)!;
export const species:{id:SpeciesId;name:string;description:string}[]=[
 {id:'human',name:'Путешественник',description:'Прежний герой с удивительно устойчивыми бровями.'},
 {id:'crystal',name:'Кристаллид',description:'Живой многогранник: резонирующие кристаллы, три глаза и очень прозрачные намерения.'},
 {id:'mycelian',name:'Мицелиец',description:'Разумная сеть спор с двумя светящимися усиками и общим чувством юмора.'},
 {id:'orbion',name:'Орбион',description:'Парящее трёхглазое существо с орбитальным кольцом и шестью щупальцами.'},
 {id:'ribbon',name:'Лентокрыл',description:'Существо из светящихся лент, с четырьмя глазами и плавниками вместо привычных рук.'},
];
function resident(id:NpcId,name:string,venue:VenueId,species:SpeciesId,color:string,vendor:boolean,first:string,story:string,preference:NpcDefinition['preference']='music'):NpcDefinition{
 const club=['meridian','comet','abyss','echo'].includes(venue);
 return {id,name,venue,species,color,vendor,kind:1,x:vendor?(club?9.4:-6):(-5),z:vendor?(club?-3:-7.6):2,reach:vendor?3.6:2.3,preference,lines:[first,'Снова знакомое лицо! Или грань. Я стараюсь запоминать и то и другое.'],story,flirtable:['vella','nai','il'].includes(id)};
}
export const extraNpcs:NpcDefinition[]=[
 {id:'lyra',name:'Лира · путешественница',venue:'nebula',species:'ribbon',color:'#d3b1ff',kind:2,x:3,z:-6,reach:2.3,preference:'stars',flirtable:true,lines:['Вчера ты продал цивилизации право назвать твоё похмелье. Корабль к сделке не прилагался. Кажется.','Звёзды помнят дорогу. Я помню, куда ты положил пропуск. Это полезнее.'],story:'Лира путешествует по картам, которые рисуют ещё не родившиеся астрономы. Единственная достоверная отметка на них — этот бар.'},
 {id:'grog',name:'Капитан Грог',venue:'nebula',species:'crystal',color:'#d78b64',kind:3,x:-8,z:0,reach:2.3,preference:'music',lines:['Я перевожу исключительно законные грузы. Законность прилагается отдельной накладной.','Корабль не пропал, пока за его парковку продолжают брать деньги.'],story:'Грог однажды провёз через таможню собственную репутацию. Таможня вернула её отправителю: превышен допустимый уровень сомнений.'},
 {id:'mira',name:'Мира-7 · андроид',venue:'nebula',color:'#accff5',kind:1,x:8,z:0,reach:2.3,preference:'logic',lines:['Анализ эмоций: 63 процента гостей улыбаются. Остальные спорят с терминалом оплаты.','Дружба успешно записана. Резервная копия — в воображаемом сердце.'],story:'Мира-7 научилась распознавать грусть по паузам между шутками. Теперь она иногда приносит чай раньше, чем его успевают попросить.'},
 resident('tick','Тик-Такт · DJ','meridian','orbion','#ad95ff',true,'У меня шесть щупалец и один бит. Идеальное соотношение для вечера.','Тик-Такт случайно зациклил собственный день рождения. Теперь каждый его сет — праздничный.'),
 resident('vella','Велла · гравитолог','meridian','ribbon','#ff9ec5',false,'Изучаю притяжение. Сегодня оно особенно сильное возле танцпола.','Велла открыла частицу неловкости: она появляется всякий раз, когда музыка заканчивается раньше танца.'),
 resident('rusk','Руск · хозяин буксира','rust','crystal','#eea46e',true,'Этот бар летал сорок лет. Теперь летает только счёт за отопление.','Руск посадил буксир на дюну, назвал это архитектурой и открыл счастливую главу жизни.','quiet'),
 resident('koro','Коро · сборщик закатов','rust','mycelian','#d8c874',false,'Закаты здесь карамельные. Не облизывай иллюминатор, пожалуйста.','Коро хранит закаты в запотевших банках. Ни одна не продаётся: это память о первом хорошем вечере.','stars'),
 resident('zhu','Жу-Флюкс · бармен','comet','orbion','#fc888a',true,'Двигатели остыли, вечеринка — ещё нет.','Жу-Флюкс не знает, где у него голова, но безошибочно знает, кому сейчас нужна вода.'),
 resident('paf','Паф · курьер невозможного','comet','ribbon','#95efc2',false,'Доставляю заказы туда, где получатель только собирается появиться.','Паф никогда не опаздывает. Иногда ему приходится ждать календарь у входа.'),
 resident('nai','Найя · смотритель купола','plankton','ribbon','#7be7e2',true,'Добро пожаловать под воду. Давление снаружи, хорошее настроение внутри.','Найя разговаривает с океаном короткими вспышками. Однажды океан ответил: «Спасибо за музыку».','stars'),
 resident('myxa','Микса · садовник света','plankton','mycelian','#9cddcf',false,'Каждый коралл здесь придумал собственный цвет. Они очень гордятся.','Микса выращивает растения, способные помнить песни. Некоторые вспоминают мелодии исчезнувших звёзд.','quiet'),
 resident('om','Ом-Ом · хранитель пауз','abyss','orbion','#73b5ef',true,'Тишина — это музыка, которую ещё никто не перебил.','Ом-Ом собирает паузы между словами. Самая длинная досталась ему от древнего дипломатического протокола.','quiet'),
 resident('yul','Юль-Ноль · исследователь эха','abyss','crystal','#a0a4ef',false,'Проверяю, умеет ли эхо смеяться. Пока оно повторяет мои худшие шутки.','Юль-Ноль отправил шутку на дно океана. Эхо вернулось через год, и оно всё ещё смеялось.','logic'),
 resident('aori','Аори · чайный архитектор','orbit','mycelian','#e8c68c',true,'Здесь чай не остывает: облака обнимают чашки.','Аори строит комнаты из спокойствия. Стены пока приходится делать из обычного материала.','quiet'),
 resident('qbit','Кью-Бит · почтальон облаков','orbit','orbion','#b7ddff',false,'Письма легче, когда в них хорошие новости. Это физика, я проверял.','Кью-Бит однажды доставил открытку самому себе. На ней было написано: «Ты справляешься».','stars'),
 resident('il','Иль · хранитель звёзд','echo','crystal','#c3a3ff',true,'Звёзды не обязаны подмигивать. Но сегодня у них настроение.','Иль умеет различать звёзды по тону их молчания. С Землёй у него пока языковой барьер.','stars'),
 resident('oro','Оро · складыватель пространства','echo','ribbon','#ffb3dc',false,'Сложил пространство пополам. Теперь до бара ровно один шаг и одна неловкая складка.','Оро собирает бумажные галактики. Некоторые начинают вращаться, когда никто не смотрит.','logic'),
];
export function interactionPoint(n:NpcDefinition):Point {
 if(n.id==='borks'||n.id==='bip')return {x:n.x,z:-4.4};
 if(n.vendor)return ['meridian','comet','abyss','echo'].includes(n.venue!)?{x:7.2,z:n.z}:{x:n.x,z:-5};
 return {x:n.x,z:n.z};
}
export interface LocalJob {id:JobId;owner:NpcId;name:string;venue:VenueId;kind:'rhythm'|'collect'|'delivery'|'rest'|'riddle';target:number;reward:number;description:string;deliverTo?:NpcId}
export const localJobs:LocalJob[]=[
 {id:'beat',owner:'tick',name:'Бит без гравитации',venue:'meridian',kind:'rhythm',target:600,reward:40,description:'Сыграй ритм-игру на танцполе «Нулевого меридиана» и набери хотя бы 600 очков. Старт — в меню.'},
 {id:'coil',owner:'rusk',name:'Буксир просит прохлады',venue:'rust',kind:'collect',target:1,reward:30,description:'Найди охлаждающую катушку в «Ржавом спутнике» и вернись к Руску.'},
 {id:'parcel',owner:'paf',name:'Посылка в облака',venue:'comet',kind:'delivery',target:1,reward:45,deliverTo:'aori',description:'Доставь посылку Аори в «Тихую орбиту» на Люмене и вернись к Пафу. Транспорт бесплатный.'},
 {id:'shells',owner:'myxa',name:'Хор светящихся раковин',venue:'plankton',kind:'collect',target:3,reward:40,description:'Найди три поющих раковины под куполом «Синего планктона» и вернись к Миксе.'},
 {id:'quiet',owner:'om',name:'Восемь секунд тишины',venue:'abyss',kind:'rest',target:8,reward:25,description:'Отдохни восемь игровых секунд на любом сиденье в «Бездне 220», затем поговори с Ом-Омом.'},
 {id:'letter',owner:'qbit',name:'Открытка шестью руками',venue:'orbit',kind:'delivery',target:1,reward:45,deliverTo:'borks',description:'Передай открытку Борксу в «Пьяной туманности» и вернись к Кью-Биту.'},
 {id:'stars',owner:'il',name:'Неоплаченная звезда',venue:'echo',kind:'riddle',target:1,reward:35,description:'Проверь звёздный терминал в «Эхе пульсара»: что остаётся нашим, если отдать его другу? Подсказка — радость.'},
];
export const worldItems:{id:string;job:JobId;venue:VenueId;name:string;x:number;z:number}[]=[
 {id:'coil-unit',job:'coil',venue:'rust',name:'Охлаждающая катушка',x:-8.5,z:-1},
 {id:'shell-a',job:'shells',venue:'plankton',name:'Поющая раковина · бас',x:-8.5,z:-1},
 {id:'shell-b',job:'shells',venue:'plankton',name:'Поющая раковина · альт',x:7.8,z:2},
 {id:'shell-c',job:'shells',venue:'plankton',name:'Поющая раковина · сопрано',x:-2.8,z:-5},
];
