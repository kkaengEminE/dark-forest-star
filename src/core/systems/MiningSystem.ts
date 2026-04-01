import type { StarDepositData, StarFragmentData } from '../models/StarFragment';
import { createStarFragment, FragmentTier } from '../models/StarFragment';

export class MiningSystem {
  static getMiningRate(minerCount: number): number {
    if (minerCount <= 0) return 0;
    return minerCount + (minerCount - 1) * 1.5;
  }

  static advanceMining(deposit: StarDepositData, dt: number): StarFragmentData[] {
    if (deposit.isDepleted || deposit.minerIds.length === 0) return [];

    const rate = this.getMiningRate(deposit.minerIds.length);
    deposit.currentMiningProgress += rate * dt;

    if (deposit.currentMiningProgress >= deposit.miningTimeRequired) {
      deposit.isDepleted = true;
      const fragments: StarFragmentData[] = [];
      // Cooperation bonus: extra fragments proportional to miner count
      const bonusFragments = Math.max(0, deposit.minerIds.length - 1);
      const totalYield = deposit.fragmentYield + bonusFragments;
      for (let i = 0; i < totalYield; i++) {
        fragments.push(createStarFragment(deposit.x, deposit.y, FragmentTier.RAW));
      }
      return fragments;
    }
    return [];
  }
}
