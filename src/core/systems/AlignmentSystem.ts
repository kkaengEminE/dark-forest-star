import type { PlayerState, LightSourceState } from '../models/Player';

export class AlignmentSystem {
  static readonly MAX = 3;

  /** 선 증가 (악이 있으면 먼저 깎고, 0이 되면 선 증가) */
  static addGoodness(p: PlayerState, amount: number): void {
    if (p.evilness > 0) {
      p.evilness = Math.max(0, p.evilness - amount);
      return;
    }
    p.goodness = Math.min(this.MAX, p.goodness + amount);
  }

  /** 악 증가 (선이 있으면 먼저 깎고, 0이 되면 악 증가) */
  static addEvilness(p: PlayerState, amount: number): void {
    if (p.goodness > 0) {
      p.goodness = Math.max(0, p.goodness - amount);
      return;
    }
    p.evilness = Math.min(this.MAX, p.evilness + amount);
  }

  /** 상자 보상 배율 (악일수록 작아짐, 선일수록 커짐) */
  static getChestRewardMultiplier(p: PlayerState): number {
    if (p.evilness >= 3) return 0;
    if (p.evilness === 2) return 0.5;
    if (p.evilness === 1) return 0.8;
    if (p.goodness === 3) return 1.5;
    if (p.goodness === 2) return 1.2;
    return 1.0;
  }

  /** NPC 상자를 도와줄 때 추가 분배율 */
  static getHelperShareBonus(p: PlayerState): number {
    if (p.goodness >= 3) return 0.25;
    if (p.goodness === 2) return 0.10;
    return 0;
  }

  /** 별조각 픽업 시 사라질 확률 */
  static getFragmentVanishChance(p: PlayerState): number {
    if (p.evilness >= 3) return 0.5;
    if (p.evilness === 2) return 0.3;
    if (p.evilness === 1) return 0.1;
    return 0;
  }

  /** 망토를 켰을 때도 새어나가는 빛의 감지 거리 (악 3은 망토 완전 무효) */
  static getCloakLeakDetectionRadius(p: PlayerState, light: LightSourceState): number {
    if (p.evilness >= 3) return light.range * 1.5;
    if (p.evilness === 2) return light.range * 0.6;
    if (p.evilness === 1) return light.range * 0.3;
    return 0;
  }
}
