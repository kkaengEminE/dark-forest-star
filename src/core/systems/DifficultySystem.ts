import { type DifficultyConfig, DifficultyLevel, DIFFICULTY_PRESETS } from '../models/Difficulty';

export class DifficultySystem {
  private static current: DifficultyConfig = DIFFICULTY_PRESETS[DifficultyLevel.STAR_5];

  static setDifficulty(level: DifficultyLevel): DifficultyConfig {
    this.current = { ...DIFFICULTY_PRESETS[level] };
    return this.current;
  }

  static getCurrent(): DifficultyConfig {
    return this.current;
  }

  static getScaledEnemyDamage(baseDamage: number): number {
    return Math.round(baseDamage * this.current.enemyDamageMultiplier);
  }

  static getScaledEnemyHp(baseHp: number): number {
    return Math.round(baseHp * this.current.enemyHpMultiplier);
  }

  static getScaledFragmentYield(baseYield: number): number {
    return Math.max(1, Math.round(baseYield * this.current.fragmentDropRate));
  }
}
