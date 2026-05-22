import { ChestData, ChestType, ChestState } from '../models/Chest';

export class ChestSystem {
  /** 채굴과 동일한 진행 속도 곡선 */
  static getOpenRate(openerCount: number): number {
    if (openerCount <= 0) return 0;
    return openerCount + (openerCount - 1) * 1.5;
  }

  static canOpen(chest: ChestData, openerCount: number): boolean {
    if (chest.type === ChestType.SOLO) return openerCount >= 1;
    return openerCount >= 2;
  }

  static advance(chest: ChestData, dt: number, openerCount: number): 'opened' | 'progress' | 'blocked' {
    if (chest.state === ChestState.OPENED) return 'opened';
    if (!this.canOpen(chest, openerCount)) return 'blocked';

    chest.state = ChestState.OPENING;
    chest.currentOpenProgress += this.getOpenRate(openerCount) * dt;

    if (chest.currentOpenProgress >= chest.openTimeRequired) {
      chest.state = ChestState.OPENED;
      return 'opened';
    }
    return 'progress';
  }

  static rollRewards(chest: ChestData, rewardMultiplier: number): { raw: number; merged: number } {
    const randInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
    const raw = randInt(chest.rewardRawMin, chest.rewardRawMax);
    const merged = randInt(chest.rewardMergedMin, chest.rewardMergedMax);
    return {
      raw: Math.max(0, Math.round(raw * rewardMultiplier)),
      merged: Math.max(0, Math.round(merged * rewardMultiplier)),
    };
  }
}
