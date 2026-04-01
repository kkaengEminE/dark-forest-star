export enum DifficultyLevel {
  STAR_5 = 5,
  STAR_6 = 6,
  STAR_8 = 8,
  STAR_12 = 12,
}

export enum MoonPhase {
  FULL = 'full',           // 보름달
  WANING_HALF = 'waning_half',  // 하현달
  WANING_CRESCENT = 'waning_crescent', // 그믐달
  NEW = 'new',             // 삭
}

export interface DifficultyConfig {
  level: DifficultyLevel;
  moonPhase: MoonPhase;
  moonBrightness: number;
  fragmentDropRate: number;
  enemyDamageMultiplier: number;
  enemyHpMultiplier: number;
  darknessDensity: number;
  enemySpawnRate: number;
  depositFrequency: number;
}

export const DIFFICULTY_PRESETS: Record<DifficultyLevel, DifficultyConfig> = {
  [DifficultyLevel.STAR_5]: {
    level: DifficultyLevel.STAR_5,
    moonPhase: MoonPhase.FULL,
    moonBrightness: 0.8,
    fragmentDropRate: 1.5,
    enemyDamageMultiplier: 0.7,
    enemyHpMultiplier: 0.7,
    darknessDensity: 0.6,
    enemySpawnRate: 0.5,
    depositFrequency: 1.5,
  },
  [DifficultyLevel.STAR_6]: {
    level: DifficultyLevel.STAR_6,
    moonPhase: MoonPhase.WANING_HALF,
    moonBrightness: 0.4,
    fragmentDropRate: 1.0,
    enemyDamageMultiplier: 1.0,
    enemyHpMultiplier: 1.0,
    darknessDensity: 0.9,
    enemySpawnRate: 1.0,
    depositFrequency: 1.0,
  },
  [DifficultyLevel.STAR_8]: {
    level: DifficultyLevel.STAR_8,
    moonPhase: MoonPhase.WANING_CRESCENT,
    moonBrightness: 0.15,
    fragmentDropRate: 0.7,
    enemyDamageMultiplier: 1.5,
    enemyHpMultiplier: 1.5,
    darknessDensity: 1.05,
    enemySpawnRate: 1.5,
    depositFrequency: 0.7,
  },
  [DifficultyLevel.STAR_12]: {
    level: DifficultyLevel.STAR_12,
    moonPhase: MoonPhase.NEW,
    moonBrightness: 0.0,
    fragmentDropRate: 0.4,
    enemyDamageMultiplier: 2.0,
    enemyHpMultiplier: 2.0,
    darknessDensity: 1.2,
    enemySpawnRate: 2.0,
    depositFrequency: 0.4,
  },
};
