export enum ChestType {
  SOLO = 'solo',
  COOP = 'coop',
}

export enum ChestState {
  CLOSED = 'closed',
  OPENING = 'opening',
  OPENED = 'opened',
}

export interface ChestData {
  id: string;
  type: ChestType;
  x: number;
  y: number;
  openTimeRequired: number;
  currentOpenProgress: number;
  state: ChestState;
  openerIds: string[];
  rewardRawMin: number;
  rewardRawMax: number;
  rewardMergedMin: number;
  rewardMergedMax: number;
  requesterNpcId?: string | null;
}

export function createChest(x: number, y: number, type: ChestType, requesterNpcId?: string): ChestData {
  const isCoop = type === ChestType.COOP;
  return {
    id: `chest-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    x,
    y,
    openTimeRequired: isCoop ? 6 : 2,
    currentOpenProgress: 0,
    state: ChestState.CLOSED,
    openerIds: [],
    rewardRawMin: isCoop ? 5 : 2,
    rewardRawMax: isCoop ? 8 : 3,
    rewardMergedMin: isCoop ? 1 : 0,
    rewardMergedMax: isCoop ? 2 : 0,
    requesterNpcId: requesterNpcId ?? null,
  };
}
