export enum FlowerType {
  BASIC = 'basic',
  ADVANCED = 'advanced',
  SPECIAL = 'special',
}

export interface FlowerData {
  id: string;
  type: FlowerType;
  x: number;
  y: number;
}

export interface FlowerShopState {
  flowers: FlowerData[];
  specialFlowerBought: boolean;
}

export function createFlower(type: FlowerType, x: number, y: number): FlowerData {
  return { id: `flower-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type, x, y };
}
