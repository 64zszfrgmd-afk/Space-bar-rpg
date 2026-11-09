import type {GameState} from './types';
import {bound} from './types';
import {currentDay} from './social';
export interface RhythmRun {start:number;hits:number[];misses:number;resolved:boolean}
export const BEAT_INTERVAL=.75,BEAT_COUNT=8,HIT_WINDOW=.2;
export function newRhythm(now:number):RhythmRun{return {start:now+1.5,hits:[],misses:0,resolved:false}}
export function hitBeat(run:RhythmRun,now:number):boolean{
 if(run.resolved)return false;const beat=Math.round((now-run.start)/BEAT_INTERVAL);
 if(beat<0||beat>=BEAT_COUNT||run.hits.includes(beat)||Math.abs(now-run.start-beat*BEAT_INTERVAL)>HIT_WINDOW){run.misses++;return false}
 run.hits.push(beat);return true;
}
export const rhythmFinished=(run:RhythmRun,now:number)=>now>run.start+(BEAT_COUNT-1)*BEAT_INTERVAL+HIT_WINDOW;
export function settleRhythm(s:GameState,run:RhythmRun):{score:number;reward:number}|null{
 if(run.resolved)return null;run.resolved=true;
 const score=Math.max(0,run.hits.length*100-run.misses*20);s.rhythm.best=Math.max(s.rhythm.best,score);
 if(s.rhythm.day!==currentDay(s)){s.rhythm.day=currentDay(s);s.rhythm.paid=0}
 const reward=score>=600&&s.rhythm.paid<3?20:0;
 if(reward){s.rhythm.paid++;s.credits+=reward;s.reputation=bound(s.reputation+1)}s.mood=bound(s.mood+(score>=600?12:4));return {score,reward};
}
