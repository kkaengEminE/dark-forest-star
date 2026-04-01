import { generateId } from '../../shared/utils';

export enum StarStickTier {
  BASIC = 'basic',
  REFINED = 'refined',
  RADIANT = 'radiant',
}

export interface StarStickData {
  id: string;
  tier: StarStickTier;
  damage: number;
  durability: number;
  maxDurability: number;
}

export const STAR_STICK_STATS: Record<StarStickTier, {
  damage: number;
  durability: number;
}> = {
  [StarStickTier.BASIC]:   { damage: 8,  durability: 20 },
  [StarStickTier.REFINED]: { damage: 20, durability: 15 },
  [StarStickTier.RADIANT]: { damage: 50, durability: 10 },
};

export function createStarStick(tier: StarStickTier = StarStickTier.BASIC): StarStickData {
  const stats = STAR_STICK_STATS[tier];
  return {
    id: generateId(),
    tier,
    damage: stats.damage,
    durability: stats.durability,
    maxDurability: stats.durability,
  };
}
