import { type PlayerState, LightSourceType, LIGHT_SOURCE_STATS } from '../models/Player';
import { XP_PER_LEVEL } from '../constants/GameConstants';

const LEVEL_LIGHT_UPGRADES: Record<number, LightSourceType> = {
  2: LightSourceType.LIGHT_BULB,
  4: LightSourceType.LED,
  6: LightSourceType.SPOTLIGHT,
  8: LightSourceType.FLOODLIGHT,
};

export class ProgressionSystem {
  static addXp(player: PlayerState, xp: number): LightSourceType | null {
    player.xp += xp;
    const nextLevelXp = XP_PER_LEVEL[player.level] ?? Infinity;

    if (player.xp >= nextLevelXp && player.level < XP_PER_LEVEL.length) {
      player.level += 1;
      player.maxHp += 10;
      player.hp = player.maxHp;

      const newType = LEVEL_LIGHT_UPGRADES[player.level];
      if (newType) {
        this.upgradeLightSource(player, newType);
        return newType;
      }
    }
    return null;
  }

  static getXpForNextLevel(player: PlayerState): number {
    return XP_PER_LEVEL[player.level] ?? Infinity;
  }

  static getXpProgress(player: PlayerState): number {
    const needed = this.getXpForNextLevel(player);
    if (needed === Infinity) return 1;
    return player.xp / needed;
  }

  private static upgradeLightSource(player: PlayerState, type: LightSourceType): void {
    const stats = LIGHT_SOURCE_STATS[type];
    player.lightSource.type = type;
    player.lightSource.brightness = stats.brightness;
    player.lightSource.range = stats.range;
    player.lightSource.maxFuel = stats.maxFuel;
    player.lightSource.fuel = stats.maxFuel;
    player.lightSource.fuelConsumptionRate = stats.fuelRate;
  }
}
