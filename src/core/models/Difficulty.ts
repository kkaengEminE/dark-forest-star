export enum DifficultyLevel {
  STAR_3 = 3,
  STAR_4 = 4,
  STAR_5 = 5,
  STAR_6 = 6,
  STAR_8 = 8,
  STAR_12 = 12,
}

export enum MoonPhase {
  FULL = 'full',
  GIBBOUS = 'gibbous',
  QUARTER = 'quarter',
  CRESCENT = 'crescent',
  NEW = 'new',
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
  [DifficultyLevel.STAR_3]: {
    level: DifficultyLevel.STAR_3,
    moonPhase: MoonPhase.FULL,
    moonBrightness: 0.8,
    fragmentDropRate: 1.5,
    enemyDamageMultiplier: 0.7,
    enemyHpMultiplier: 0.7,
    darknessDensity: 0.6,
    enemySpawnRate: 0.5,
    depositFrequency: 1.5,
  },
  [DifficultyLevel.STAR_4]: {
    level: DifficultyLevel.STAR_4,
    moonPhase: MoonPhase.GIBBOUS,
    moonBrightness: 0.6,
    fragmentDropRate: 1.2,
    enemyDamageMultiplier: 0.85,
    enemyHpMultiplier: 0.85,
    darknessDensity: 0.75,
    enemySpawnRate: 0.75,
    depositFrequency: 1.2,
  },
  [DifficultyLevel.STAR_5]: {
    level: DifficultyLevel.STAR_5,
    moonPhase: MoonPhase.QUARTER,
    moonBrightness: 0.4,
    fragmentDropRate: 1.0,
    enemyDamageMultiplier: 1.0,
    enemyHpMultiplier: 1.0,
    darknessDensity: 0.9,
    enemySpawnRate: 1.0,
    depositFrequency: 1.0,
  },
  [DifficultyLevel.STAR_6]: {
    level: DifficultyLevel.STAR_6,
    moonPhase: MoonPhase.CRESCENT,
    moonBrightness: 0.2,
    fragmentDropRate: 0.8,
    enemyDamageMultiplier: 1.3,
    enemyHpMultiplier: 1.3,
    darknessDensity: 1.0,
    enemySpawnRate: 1.3,
    depositFrequency: 0.8,
  },
  [DifficultyLevel.STAR_8]: {
    level: DifficultyLevel.STAR_8,
    moonPhase: MoonPhase.CRESCENT,
    moonBrightness: 0.1,
    fragmentDropRate: 0.6,
    enemyDamageMultiplier: 1.6,
    enemyHpMultiplier: 1.6,
    darknessDensity: 1.1,
    enemySpawnRate: 1.6,
    depositFrequency: 0.6,
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
