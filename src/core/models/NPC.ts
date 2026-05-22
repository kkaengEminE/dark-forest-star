import type { LightSourceState } from './Player';
import type { InventoryState } from './Inventory';
import { LightSourceType, LIGHT_SOURCE_STATS } from './Player';
import { createDefaultInventory } from './Inventory';
import { generateId } from '../../shared/utils';

export enum NPCDisposition {
  FRIENDLY = 'friendly',
  NEUTRAL = 'neutral',
  HOSTILE = 'hostile',
}

export enum NPCAction {
  IDLE = 'idle',
  MINING = 'mining',
  COOPERATING = 'cooperating',
  FLEEING = 'fleeing',
  ATTACKING = 'attacking',
  DRAWN_TO_LIGHT = 'drawn_to_light',
  OPENING_CHEST = 'opening_chest',
  REQUESTING_HELP = 'requesting_help',
}

export interface NPCData {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  disposition: NPCDisposition;
  lightScore: number;
  hammerScore: number;
  cooperationLevel: number;
  hammerLevel: number;
  lightSource: LightSourceState;
  inventory: InventoryState;
  currentAction: NPCAction;
  trustOfPlayer: number;
  targetChestId?: string | null;
  drawTargetX?: number;
  drawTargetY?: number;
}

export function createNPC(x: number, y: number, disposition: NPCDisposition = NPCDisposition.NEUTRAL): NPCData {
  const stats = LIGHT_SOURCE_STATS[LightSourceType.CANDLE];
  return {
    id: generateId(),
    x,
    y,
    hp: 80,
    maxHp: 80,
    disposition,
    lightScore: 0,
    hammerScore: 0,
    cooperationLevel: 0,
    hammerLevel: 0,
    lightSource: {
      type: LightSourceType.CANDLE,
      brightness: stats.brightness,
      range: stats.range,
      fuel: stats.maxFuel,
      maxFuel: stats.maxFuel,
      fuelConsumptionRate: stats.fuelRate,
      isCloaked: false,
      isOn: true,
    },
    inventory: createDefaultInventory(),
    currentAction: NPCAction.IDLE,
    trustOfPlayer: 0,
  };
}
