export const VERSION = '0.20.0';
export const NPC_IDS = ['bip', 'zora', 'quik', 'plukh', 'borks', 'zip'] as const;
export type NpcId = typeof NPC_IDS[number];
export type QuestStatus = 'new'|'active'|'ready'|'done';
export type QuestId = 'party'|'syrup';
export interface Relation {points: number; greetDay: number; treatDay: number; gift: boolean}
export interface GameState {
  schema: 1;
  version: string;
  credits: number;
  energy: number;
  mood: number;
  buzz: number;
  met: string[];
  relations: Record<string, Relation>;
  quests: Record<QuestId, QuestStatus>;
  partyDance: number;
  syrupStage: 0|1|2;
  worldTime: number;
  decisions: string[];
}
export interface Point {x: number; z: number}
export interface Seat extends Point {id: string; name: string; height: number; yaw: number; exits: Point[]}
export interface Drink {id: string; name: string; price: number; energy: number; mood: number; buzz: number; alcoholic: boolean; description: string}
export const bound = (n: number): number => Math.max(0, Math.min(100, n));
