import type {GameState} from './types';
export type StoryAction='borks'|'witness'|'lyra'|'clue'|'physical'|'digital'|'exit';
export const storyHints=[
 'Куда делся мой корабль? Спроси Боркса о вчерашней вечеринке.',
 'Найди свидетеля вечеринки: поговори с Зипом у танцпола.',
 'Познакомься с Лирой возле панорамного окна.',
 'Попроси Лиру расшифровать странную сделку.',
 'Найди пропуск у левого дивана или попроси Миру-7 восстановить цифровую копию.',
 'Пропуск найден! Подойди к выходу за DJ-пультом.',
 'Доки открыты. Карта планет и каюта доступны в меню.',
];
export function advanceStory(s:GameState,action:StoryAction):boolean{
 const stages:Record<StoryAction,number>={borks:0,witness:1,lyra:2,clue:3,physical:4,digital:4,exit:5};
 if(s.story!==stages[action])return false;
 s.story++;
 if(action==='physical'||action==='digital'){s.inventory.push('station-pass');s.decisions.push('pass:'+action)}
 if(action==='exit'){s.credits+=40;s.reputation=Math.min(100,s.reputation+5);s.decisions.push('docks:open')}
 return true;
}
