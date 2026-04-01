import { generateId } from '../../shared/utils';

export enum HammerType {
  RUBBER_MALLET = 'rubber_mallet',
  RUBBER_HAMMER = 'rubber_hammer',
  IRON_HAMMER = 'iron_hammer',
  TITANIUM_HAMMER = 'titanium_hammer',
}

export enum AnimalSpecies {
  HAMMER_BIRD = 'hammer_bird',
  HAMMER_WOLF = 'hammer_wolf',
  HAMMER_BEAR = 'hammer_bear',
  HAMMER_TIGER = 'hammer_tiger',
  HAMMER_ELEPHANT = 'hammer_elephant',
}

export enum AnimalState {
  ROAMING = 'roaming',
  ALERT = 'alert',
  CHARGING = 'charging',
  ATTACKING = 'attacking',
  RETREATING = 'retreating',
}

export interface HammerAnimalData {
  id: string;
  species: AnimalSpecies;
  hammerType: HammerType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  detectionRange: number;
  attackRange: number;
  state: AnimalState;
  targetId: string | null;
  patrolPath: { x: number; y: number }[];
  patrolIndex: number;
  alertTimer: number;
  attackCooldown: number;
}

export const HAMMER_ANIMAL_STATS: Record<AnimalSpecies, {
  baseHp: number;
  baseDamage: number;
  speed: number;
  detectionRange: number;
  attackRange: number;
}> = {
  [AnimalSpecies.HAMMER_BIRD]:     { baseHp: 20,  baseDamage: 5,  speed: 120, detectionRange: 200, attackRange: 25 },
  [AnimalSpecies.HAMMER_WOLF]:     { baseHp: 40,  baseDamage: 10, speed: 100, detectionRange: 180, attackRange: 30 },
  [AnimalSpecies.HAMMER_BEAR]:     { baseHp: 80,  baseDamage: 20, speed: 60,  detectionRange: 150, attackRange: 40 },
  [AnimalSpecies.HAMMER_TIGER]:    { baseHp: 60,  baseDamage: 25, speed: 130, detectionRange: 220, attackRange: 35 },
  [AnimalSpecies.HAMMER_ELEPHANT]: { baseHp: 150, baseDamage: 35, speed: 40,  detectionRange: 120, attackRange: 50 },
};

export const HAMMER_TYPE_MULTIPLIER: Record<HammerType, number> = {
  [HammerType.RUBBER_MALLET]:  0.5,
  [HammerType.RUBBER_HAMMER]:  0.8,
  [HammerType.IRON_HAMMER]:    1.0,
  [HammerType.TITANIUM_HAMMER]: 1.5,
};

export function createHammerAnimal(
  species: AnimalSpecies,
  hammerType: HammerType,
  x: number,
  y: number,
  patrolPath: { x: number; y: number }[],
): HammerAnimalData {
  const stats = HAMMER_ANIMAL_STATS[species];
  const mult = HAMMER_TYPE_MULTIPLIER[hammerType];
  return {
    id: generateId(),
    species,
    hammerType,
    x,
    y,
    hp: Math.round(stats.baseHp * mult),
    maxHp: Math.round(stats.baseHp * mult),
    damage: Math.round(stats.baseDamage * mult),
    speed: stats.speed,
    detectionRange: stats.detectionRange,
    attackRange: stats.attackRange,
    state: AnimalState.ROAMING,
    targetId: null,
    patrolPath,
    patrolIndex: 0,
    alertTimer: 0,
    attackCooldown: 0,
  };
}
