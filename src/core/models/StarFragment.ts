import { generateId } from '../../shared/utils';

export enum FragmentTier {
  RAW = 'raw',
  MERGED = 'merged',
  SUPER_MERGED = 'super',
}

export interface StarFragmentData {
  id: string;
  tier: FragmentTier;
  x: number;
  y: number;
}

export interface StarDepositData {
  id: string;
  x: number;
  y: number;
  miningTimeRequired: number;
  currentMiningProgress: number;
  fragmentYield: number;
  isBeingMined: boolean;
  minerIds: string[];
  isDepleted: boolean;
}

export function createStarFragment(x: number, y: number, tier: FragmentTier = FragmentTier.RAW): StarFragmentData {
  return { id: generateId(), tier, x, y };
}

export function createStarDeposit(x: number, y: number): StarDepositData {
  return {
    id: generateId(),
    x,
    y,
    miningTimeRequired: 3 + Math.random() * 4, // 3-7 seconds
    currentMiningProgress: 0,
    fragmentYield: 2 + Math.floor(Math.random() * 4), // 2-5 fragments
    isBeingMined: false,
    minerIds: [],
    isDepleted: false,
  };
}
