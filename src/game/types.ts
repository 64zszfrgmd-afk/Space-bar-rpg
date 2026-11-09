export const VERSION = '0.21.1';
export const CONTENT_REVISION = 'touch-flow-1';
export const VENUE_IDS = ['nebula','meridian','rust','comet','plankton','abyss','orbit','echo','cabin'] as const;
export type VenueId = typeof VENUE_IDS[number];
export const SPECIES_IDS = ['human','crystal','mycelian','orbion','ribbon'] as const;
export type SpeciesId = typeof SPECIES_IDS[number];
export const JOB_IDS = ['beat','coil','parcel','shells','quiet','letter','stars'] as const;
export type JobId = typeof JOB_IDS[number];
export interface JobState {status:QuestStatus; progress:number}
export type Quality = 'auto'|'low'|'balanced'|'high';
export const NPC_IDS = ['bip', 'zora', 'quik', 'plukh', 'borks', 'zip','lyra','grog','mira','tick','vella','rusk','koro','zhu','paf','nai','myxa','om','yul','aori','qbit','il','oro'] as const;
export type NpcId = typeof NPC_IDS[number];
export type QuestStatus = 'new'|'active'|'ready'|'done';
export type QuestId = 'party'|'syrup';
export interface Relation {points: number; greetDay: number; treatDay: number; gift: boolean}
export interface GameState {
  schema: 2;
  revision:string;
  hero:{name:string;species:SpeciesId;color:string;accessory:'none'|'halo'|'hat';dance:0|1|2};
  settings:{quality:Quality;volume:number};
  venue:VenueId;
  visited:VenueId[];
  story:number;
  travelUnlocked:boolean;
  reputation:number;
  inventory:string[];
  npcMoods:Record<string,number>;
  jobs:Record<JobId,JobState>;
  rhythm:{best:number;day:number;paid:number};
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
