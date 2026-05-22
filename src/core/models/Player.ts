import { PLAYER_BASE_HP, PLAYER_BASE_SPEED } from '../constants/GameConstants';

export enum LightSourceType {
  CANDLE = 'candle',
  LIGHT_BULB = 'light_bulb',
  LED = 'led',
  SPOTLIGHT = 'spotlight',
  FLOODLIGHT = 'floodlight',
}

export interface LightSourceState {
  type: LightSourceType;
  brightness: number;
  range: number;
  fuel: number;
  maxFuel: number;
  fuelConsumptionRate: number;
  isCloaked: boolean;
  isOn: boolean;
}

export const LIGHT_SOURCE_STATS: Record<LightSourceType, {
  brightness: number;
  range: number;
  maxFuel: number;
  fuelRate: number;
}> = {
  [LightSourceType.CANDLE]:     { brightness: 0.3, range: 80,  maxFuel: 100, fuelRate: 1.0 },
  [LightSourceType.LIGHT_BULB]: { brightness: 0.5, range: 130, maxFuel: 150, fuelRate: 0.8 },
  [LightSourceType.LED]:        { brightness: 0.7, range: 180, maxFuel: 200, fuelRate: 0.5 },
  [LightSourceType.SPOTLIGHT]:  { brightness: 0.85, range: 240, maxFuel: 250, fuelRate: 0.4 },
  [LightSourceType.FLOODLIGHT]: { brightness: 1.0, range: 320, maxFuel: 300, fuelRate: 0.3 },
};

export interface PlayerState {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  xp: number;
  level: number;
  speed: number;
  lightSource: LightSourceState;
  lightScore: number;
  hammerScore: number;
  cooperationLevel: number;
  hammerLevel: number;
  goodness: number;
  evilness: number;
  isAlive: boolean;
}

export const LIGHT_VISUAL_BY_TYPE: Record<LightSourceType, { bodyScale: number; rangeMul: number }> = {
  [LightSourceType.CANDLE]:     { bodyScale: 0.40, rangeMul: 0.45 },
  [LightSourceType.LIGHT_BULB]: { bodyScale: 0.60, rangeMul: 0.70 },
  [LightSourceType.LED]:        { bodyScale: 0.80, rangeMul: 1.00 },
  [LightSourceType.SPOTLIGHT]:  { bodyScale: 1.00, rangeMul: 1.35 },
  [LightSourceType.FLOODLIGHT]: { bodyScale: 1.20, rangeMul: 1.80 },
};

export function createDefaultPlayer(x: number, y: number): PlayerState {
  const stats = LIGHT_SOURCE_STATS[LightSourceType.CANDLE];
  return {
    x,
    y,
    hp: PLAYER_BASE_HP,
    maxHp: PLAYER_BASE_HP,
    xp: 0,
    level: 1,
    speed: PLAYER_BASE_SPEED,
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
    lightScore: 0,
    hammerScore: 0,
    cooperationLevel: 0,
    hammerLevel: 0,
    goodness: 1,
    evilness: 0,
    isAlive: true,
  };
}
