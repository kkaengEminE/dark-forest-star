import type { StarStickData } from '../models/StarStick';
import type { HammerAnimalData } from '../models/HammerAnimal';
import type { PlayerState } from '../models/Player';

export class CombatSystem {
  static playerAttackEnemy(stick: StarStickData, target: HammerAnimalData): {
    damage: number;
    targetDead: boolean;
    stickBroken: boolean;
  } {
    const damage = stick.damage;
    target.hp -= damage;
    stick.durability -= 1;
    return {
      damage,
      targetDead: target.hp <= 0,
      stickBroken: stick.durability <= 0,
    };
  }

  static enemyAttackPlayer(attacker: HammerAnimalData, player: PlayerState, difficultyMultiplier: number = 1): {
    damage: number;
    playerDead: boolean;
  } {
    const damage = Math.round(attacker.damage * difficultyMultiplier);
    player.hp = Math.max(0, player.hp - damage);
    const playerDead = player.hp <= 0;
    if (playerDead) {
      player.isAlive = false;
    }
    return { damage, playerDead };
  }

  static healPlayer(player: PlayerState, amount: number): void {
    player.hp = Math.min(player.maxHp, player.hp + amount);
  }

  static naturalRegen(player: PlayerState, regenRate: number, dt: number): void {
    if (player.hp < player.maxHp && player.isAlive) {
      player.hp = Math.min(player.maxHp, player.hp + regenRate * dt);
    }
  }
}
