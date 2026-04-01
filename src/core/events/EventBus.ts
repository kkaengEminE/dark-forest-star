import type { LightSourceType } from '../models/Player';
import type { StarFragmentData } from '../models/StarFragment';
import type { DifficultyConfig } from '../models/Difficulty';

export interface EventMap {
  'player:moved': { x: number; y: number };
  'player:damaged': { hp: number; maxHp: number; damage: number };
  'player:levelUp': { level: number; newLightType: LightSourceType | null };
  'player:died': Record<string, never>;
  'player:hammerTransform': Record<string, never>;
  'light:toggled': { isOn: boolean; isCloaked: boolean };
  'light:fuelChanged': { fuel: number; maxFuel: number };
  'fragment:collected': { fragment: StarFragmentData; totalCount: number };
  'fragment:merged': { result: StarFragmentData };
  'deposit:miningProgress': { depositId: string; progress: number; total: number };
  'deposit:mined': { depositId: string; fragments: StarFragmentData[] };
  'enemy:alert': { enemyId: string; x: number; y: number };
  'enemy:charging': { enemyId: string };
  'enemy:died': { enemyId: string; drops: StarFragmentData[] };
  'combat:playerHit': { damage: number };
  'combat:enemyHit': { enemyId: string; damage: number };
  'npc:interact': { npcId: string; action: 'cooperate' | 'attack' };
  'cooperation:resolved': { playerReward: number; npcReward: number };
  'game:difficultySet': { config: DifficultyConfig };
  'game:ending': Record<string, never>;
}

type EventCallback<K extends keyof EventMap> = (data: EventMap[K]) => void;

export class EventBus {
  private listeners = new Map<string, Set<Function>>();

  on<K extends keyof EventMap>(event: K, callback: EventCallback<K>): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback);
  }

  off<K extends keyof EventMap>(event: K, callback: EventCallback<K>): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    this.listeners.get(event)?.forEach(cb => (cb as EventCallback<K>)(data));
  }
}

export const eventBus = new EventBus();
