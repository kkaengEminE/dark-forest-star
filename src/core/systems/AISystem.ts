import { type HammerAnimalData, AnimalState } from '../models/HammerAnimal';
import type { PlayerState } from '../models/Player';
import { LightSystem } from './LightSystem';
import { AlignmentSystem } from './AlignmentSystem';
import { distance } from '../../shared/utils';

const ALERT_DURATION = 1.5;
const ATTACK_COOLDOWN = 1.0;

export class AISystem {
  static updateAnimal(
    animal: HammerAnimalData,
    playerState: PlayerState,
    dt: number,
  ): { shouldAttack: boolean } {
    const distToPlayer = distance(animal.x, animal.y, playerState.x, playerState.y);
    let playerDetectionRadius = LightSystem.getDetectionRadius(playerState.lightSource);
    // Cloak leak: even when cloaked, evil players leak some light
    if (playerDetectionRadius === 0) {
      playerDetectionRadius = AlignmentSystem.getCloakLeakDetectionRadius(playerState, playerState.lightSource);
    }
    let shouldAttack = false;

    if (animal.attackCooldown > 0) {
      animal.attackCooldown -= dt;
    }

    switch (animal.state) {
      case AnimalState.ROAMING:
        this.patrol(animal, dt);
        if (playerDetectionRadius > 0 && distToPlayer < animal.detectionRange) {
          animal.state = AnimalState.ALERT;
          animal.alertTimer = ALERT_DURATION;
          animal.targetId = 'player';
        }
        break;

      case AnimalState.ALERT:
        animal.alertTimer -= dt;
        if (animal.alertTimer <= 0) {
          animal.state = AnimalState.CHARGING;
        }
        if (playerDetectionRadius === 0) {
          animal.state = AnimalState.RETREATING;
          animal.targetId = null;
        }
        break;

      case AnimalState.CHARGING:
        this.moveToward(animal, playerState.x, playerState.y, animal.speed * 1.5, dt);
        if (distToPlayer < animal.attackRange) {
          animal.state = AnimalState.ATTACKING;
        }
        if (playerDetectionRadius === 0 && distToPlayer > animal.detectionRange * 0.5) {
          animal.state = AnimalState.RETREATING;
          animal.targetId = null;
        }
        break;

      case AnimalState.ATTACKING:
        if (animal.attackCooldown <= 0) {
          shouldAttack = true;
          animal.attackCooldown = ATTACK_COOLDOWN;
        }
        if (distToPlayer > animal.attackRange * 1.5) {
          animal.state = AnimalState.CHARGING;
        }
        if (playerDetectionRadius === 0 && distToPlayer > animal.detectionRange * 0.3) {
          animal.state = AnimalState.RETREATING;
          animal.targetId = null;
        }
        break;

      case AnimalState.RETREATING:
        this.returnToPatrol(animal, dt);
        if (this.isNearPatrolPoint(animal)) {
          animal.state = AnimalState.ROAMING;
        }
        // Re-detect if player turns light back on
        if (playerDetectionRadius > 0 && distToPlayer < animal.detectionRange * 0.8) {
          animal.state = AnimalState.ALERT;
          animal.alertTimer = ALERT_DURATION * 0.5;
          animal.targetId = 'player';
        }
        break;
    }

    return { shouldAttack };
  }

  private static patrol(animal: HammerAnimalData, dt: number): void {
    if (animal.patrolPath.length === 0) return;
    const target = animal.patrolPath[animal.patrolIndex];
    this.moveToward(animal, target.x, target.y, animal.speed * 0.6, dt);
    if (distance(animal.x, animal.y, target.x, target.y) < 8) {
      animal.patrolIndex = (animal.patrolIndex + 1) % animal.patrolPath.length;
    }
  }

  private static moveToward(
    entity: { x: number; y: number },
    tx: number, ty: number,
    speed: number, dt: number,
  ): void {
    const dx = tx - entity.x;
    const dy = ty - entity.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;
    entity.x += (dx / dist) * speed * dt;
    entity.y += (dy / dist) * speed * dt;
  }

  /** Public version for NPC movement */
  static moveNpcToward(
    entity: { x: number; y: number },
    tx: number, ty: number,
    speed: number, dt: number,
  ): void {
    const dx = tx - entity.x;
    const dy = ty - entity.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;
    entity.x += (dx / dist) * speed * dt;
    entity.y += (dy / dist) * speed * dt;
  }

  private static returnToPatrol(animal: HammerAnimalData, dt: number): void {
    if (animal.patrolPath.length === 0) return;
    const target = animal.patrolPath[animal.patrolIndex];
    this.moveToward(animal, target.x, target.y, animal.speed * 0.8, dt);
  }

  private static isNearPatrolPoint(animal: HammerAnimalData): boolean {
    if (animal.patrolPath.length === 0) return true;
    const target = animal.patrolPath[animal.patrolIndex];
    return distance(animal.x, animal.y, target.x, target.y) < 15;
  }
}
