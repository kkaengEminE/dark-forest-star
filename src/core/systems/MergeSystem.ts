import { FragmentTier, type StarFragmentData, createStarFragment } from '../models/StarFragment';
import { StarStickTier, type StarStickData, STAR_STICK_STATS, createStarStick } from '../models/StarStick';
import { MERGE_COUNT, STICK_CRAFT_COUNT, STICK_MERGE_COUNT } from '../constants/GameConstants';

export class MergeSystem {
  static mergeFragments(fragments: StarFragmentData[]): StarFragmentData | null {
    if (fragments.length !== MERGE_COUNT) return null;
    const tier = fragments[0].tier;
    if (!fragments.every(f => f.tier === tier)) return null;

    let newTier: FragmentTier;
    switch (tier) {
      case FragmentTier.RAW:    newTier = FragmentTier.MERGED; break;
      case FragmentTier.MERGED: newTier = FragmentTier.SUPER_MERGED; break;
      default: return null;
    }

    return createStarFragment(0, 0, newTier);
  }

  static craftStarStick(fragments: StarFragmentData[]): StarStickData | null {
    if (fragments.length !== STICK_CRAFT_COUNT) return null;
    if (!fragments.every(f => f.tier === FragmentTier.RAW)) return null;
    return createStarStick(StarStickTier.BASIC);
  }

  static mergeStarSticks(sticks: StarStickData[]): StarStickData | null {
    if (sticks.length !== STICK_MERGE_COUNT) return null;
    const tier = sticks[0].tier;
    if (!sticks.every(s => s.tier === tier)) return null;

    let newTier: StarStickTier;
    switch (tier) {
      case StarStickTier.BASIC:   newTier = StarStickTier.REFINED; break;
      case StarStickTier.REFINED: newTier = StarStickTier.RADIANT; break;
      default: return null;
    }

    return createStarStick(newTier);
  }

  static getXpValue(fragment: StarFragmentData): number {
    switch (fragment.tier) {
      case FragmentTier.RAW:          return 10;
      case FragmentTier.MERGED:       return 120;
      case FragmentTier.SUPER_MERGED: return 1500;
    }
  }

  static getHealValue(fragment: StarFragmentData): number {
    switch (fragment.tier) {
      case FragmentTier.RAW:          return 5;
      case FragmentTier.MERGED:       return 60;
      case FragmentTier.SUPER_MERGED: return 800;
    }
  }
}
