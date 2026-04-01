import { FragmentTier } from './StarFragment';
import { DifficultyLevel } from './Difficulty';

export interface VertexStarState {
  vertexIndex: number;
  isPlaced: boolean;
  requiredTier: FragmentTier;
}

export function getRequiredTier(difficulty: DifficultyLevel): FragmentTier {
  switch (difficulty) {
    case DifficultyLevel.STAR_5:
    case DifficultyLevel.STAR_6:
      return FragmentTier.MERGED;
    case DifficultyLevel.STAR_8:
    case DifficultyLevel.STAR_12:
      return FragmentTier.SUPER_MERGED;
  }
}

export function createVertexStarStates(sides: number, difficulty: DifficultyLevel): VertexStarState[] {
  const tier = getRequiredTier(difficulty);
  return Array.from({ length: sides }, (_, i) => ({
    vertexIndex: i,
    isPlaced: false,
    requiredTier: tier,
  }));
}
