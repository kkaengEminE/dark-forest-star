export interface ScoreChange {
  lightScore: number;
  hammerScore: number;
}

export interface InteractionResult {
  playerReward: number;
  npcReward: number;
  playerScoreChange: ScoreChange;
  npcScoreChange: ScoreChange;
}

export class CooperationSystem {
  static resolveInteraction(
    playerAction: 'cooperate' | 'attack',
    npcAction: 'cooperate' | 'attack',
  ): InteractionResult {
    const matrix: Record<string, { p: number; n: number }> = {
      'cooperate-cooperate': { p: 3, n: 3 },
      'cooperate-attack':    { p: 0, n: 5 },
      'attack-cooperate':    { p: 5, n: 0 },
      'attack-attack':       { p: 1, n: 1 },
    };

    const key = `${playerAction}-${npcAction}`;
    const payoff = matrix[key];

    return {
      playerReward: payoff.p,
      npcReward: payoff.n,
      playerScoreChange: playerAction === 'cooperate'
        ? { lightScore: 2, hammerScore: 0 }
        : { lightScore: 0, hammerScore: 3 },
      npcScoreChange: npcAction === 'cooperate'
        ? { lightScore: 2, hammerScore: 0 }
        : { lightScore: 0, hammerScore: 3 },
    };
  }

  static checkHammerTransformation(hammerScore: number, lightScore: number): boolean {
    return hammerScore >= 50 && hammerScore > lightScore * 2;
  }

  static getCooperationReward(lightScore: number): { level: number; starBonus: number } {
    const level = Math.floor(lightScore / 10);
    return { level, starBonus: level * 5 };
  }

  static decideNPCAction(trustOfPlayer: number): 'cooperate' | 'attack' {
    if (trustOfPlayer > 20) return 'cooperate';
    if (trustOfPlayer < -20) return 'attack';
    return Math.random() < (trustOfPlayer + 50) / 100 ? 'cooperate' : 'attack';
  }
}
