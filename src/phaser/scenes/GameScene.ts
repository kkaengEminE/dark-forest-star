import Phaser from 'phaser';
import { createDefaultPlayer, type PlayerState } from '../../core/models/Player';
import { createDefaultInventory, addFragment, type InventoryState } from '../../core/models/Inventory';
import { createStarFragment, createStarDeposit, FragmentTier, type StarFragmentData, type StarDepositData } from '../../core/models/StarFragment';
import { createHammerAnimal, AnimalSpecies, HammerType, type HammerAnimalData } from '../../core/models/HammerAnimal';
import { createNPC, NPCDisposition, type NPCData, NPCAction } from '../../core/models/NPC';
import { DifficultyLevel, DIFFICULTY_PRESETS, type DifficultyConfig } from '../../core/models/Difficulty';
import { LightSystem } from '../../core/systems/LightSystem';
import { AISystem } from '../../core/systems/AISystem';
import { CombatSystem } from '../../core/systems/CombatSystem';
import { MiningSystem } from '../../core/systems/MiningSystem';
import { MergeSystem } from '../../core/systems/MergeSystem';
import { ProgressionSystem } from '../../core/systems/ProgressionSystem';
import { CooperationSystem } from '../../core/systems/CooperationSystem';
import { HP_REGEN_RATE, MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, TREE_COUNT, FRAGMENT_SCATTER_COUNT, DEPOSIT_COUNT } from '../../core/constants/GameConstants';
import { eventBus } from '../../core/events/EventBus';
import { distance } from '../../shared/utils';

import { PlayerSprite } from '../entities/PlayerSprite';
import { HammerAnimalSprite } from '../entities/HammerAnimalSprite';
import { StarFragmentSprite } from '../entities/StarFragmentSprite';
import { StarDepositSprite } from '../entities/StarDepositSprite';
import { NPCSprite } from '../entities/NPCSprite';
import { LightingRenderer } from '../systems/LightingRenderer';
import { CameraSystem } from '../systems/CameraSystem';
import { HUD } from '../ui/HUD';
import { MiningUI } from '../ui/MiningUI';
import { InventoryUI } from '../ui/InventoryUI';

const PICKUP_RANGE = 24;
const MINING_RANGE = 48;
const ATTACK_RANGE = 40;
const NPC_INTERACT_RANGE = 60;
const ENEMY_COUNT = 8;
const NPC_COUNT = 4;

export class GameScene extends Phaser.Scene {
  // Core state
  private playerState!: PlayerState;
  private inventory!: InventoryState;
  private difficulty!: DifficultyConfig;
  private fragments: StarFragmentData[] = [];
  private deposits: StarDepositData[] = [];
  private enemies: HammerAnimalData[] = [];
  private npcs: NPCData[] = [];

  // Phaser rendering
  private playerSprite!: PlayerSprite;
  private enemySprites = new Map<string, HammerAnimalSprite>();
  private fragmentSprites = new Map<string, StarFragmentSprite>();
  private depositSprites = new Map<string, StarDepositSprite>();
  private npcSprites = new Map<string, NPCSprite>();
  private lightingRenderer!: LightingRenderer;
  private cameraSystem!: CameraSystem;
  private hud!: HUD;
  private miningUI!: MiningUI;
  private inventoryUI!: InventoryUI;
  private treeGroup!: Phaser.Physics.Arcade.StaticGroup;

  // Input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private keyQ!: Phaser.Input.Keyboard.Key;
  private keyZ!: Phaser.Input.Keyboard.Key;
  private keyE!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;
  private key1!: Phaser.Input.Keyboard.Key;
  private key2!: Phaser.Input.Keyboard.Key;
  private key3!: Phaser.Input.Keyboard.Key;
  private key4!: Phaser.Input.Keyboard.Key;

  // Mining state
  private currentMiningDeposit: StarDepositData | null = null;

  // Message display
  private messageText!: Phaser.GameObjects.Text;
  private messageTimer = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { difficulty?: DifficultyLevel }): void {
    const level = data.difficulty ?? DifficultyLevel.STAR_5;
    this.difficulty = { ...DIFFICULTY_PRESETS[level] };
  }

  create(): void {
    // Physics world bounds
    this.physics.world.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Generate world
    this.generateForest();
    this.spawnEntities();

    // Player
    const spawnX = MAP_WIDTH / 2;
    const spawnY = MAP_HEIGHT / 2;
    this.playerState = createDefaultPlayer(spawnX, spawnY);
    this.inventory = createDefaultInventory();
    this.playerSprite = new PlayerSprite(this, spawnX, spawnY);

    // Collision with trees
    this.physics.add.collider(this.playerSprite.sprite, this.treeGroup);

    // Camera
    this.cameraSystem = new CameraSystem(this, this.playerSprite.sprite);

    // Lighting
    this.lightingRenderer = new LightingRenderer(this, this.difficulty.moonBrightness);

    // HUD
    this.hud = new HUD(this);
    this.miningUI = new MiningUI(this);
    this.inventoryUI = new InventoryUI(this, this.inventory);

    // Message text
    this.messageText = this.add.text(480, 500, '', {
      fontSize: '13px',
      color: '#ffcc44',
      fontFamily: 'monospace',
      align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1200).setAlpha(0);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey('W'),
      A: this.input.keyboard!.addKey('A'),
      S: this.input.keyboard!.addKey('S'),
      D: this.input.keyboard!.addKey('D'),
    };
    this.keyQ = this.input.keyboard!.addKey('Q');
    this.keyZ = this.input.keyboard!.addKey('Z');
    this.keyE = this.input.keyboard!.addKey('E');
    this.keySpace = this.input.keyboard!.addKey('SPACE');
    this.key1 = this.input.keyboard!.addKey('ONE');
    this.key2 = this.input.keyboard!.addKey('TWO');
    this.key3 = this.input.keyboard!.addKey('THREE');
    this.key4 = this.input.keyboard!.addKey('FOUR');

    // Key handlers
    this.keyQ.on('down', () => { if (!this.inventoryUI.isOpen()) this.toggleCloak(); });
    this.keyE.on('down', () => this.inventoryUI.toggle());
    this.keySpace.on('down', () => { if (!this.inventoryUI.isOpen()) this.playerAttack(); });

    // Inventory keyboard shortcuts
    this.key1.on('down', () => this.inventoryKeyAction('ONE'));
    this.key2.on('down', () => this.inventoryKeyAction('TWO'));
    this.key3.on('down', () => this.inventoryKeyAction('THREE'));
    this.key4.on('down', () => this.inventoryKeyAction('FOUR'));

    // Wire inventory to player state
    this.inventoryUI.setPlayerState(this.playerState);

    // Spawn visual entities
    this.createVisualEntities();
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;

    if (!this.playerState.isAlive) return;
    if (this.inventoryUI.isOpen()) return;

    // Movement
    this.handleMovement(dt);

    // Light system
    LightSystem.consumeFuel(this.playerState.lightSource, dt);

    // HP regen
    CombatSystem.naturalRegen(this.playerState, HP_REGEN_RATE, dt);

    // Fragment pickup
    this.checkFragmentPickup();

    // Mining
    this.handleMining(dt);

    // NPC proximity
    this.handleNPCInteraction(dt);

    // Enemy AI
    this.updateEnemies(dt);

    // Check hammer transformation
    if (CooperationSystem.checkHammerTransformation(this.playerState.hammerScore, this.playerState.lightScore)) {
      this.playerState.isAlive = false;
      eventBus.emit('player:hammerTransform', {});
      this.showMessage('망치 점수가 너무 높아 망치동물이 되었습니다...');
      this.time.delayedCall(3000, () => this.scene.start('GameOverScene', { reason: 'hammer' }));
      return;
    }

    // Update visuals
    this.updateVisuals();

    // Message timer
    if (this.messageTimer > 0) {
      this.messageTimer -= dt;
      if (this.messageTimer <= 0) {
        this.messageText.setAlpha(0);
      }
    }
  }

  // --- World Generation ---

  private generateForest(): void {
    // Ground
    for (let x = 0; x < MAP_WIDTH; x += TILE_SIZE) {
      for (let y = 0; y < MAP_HEIGHT; y += TILE_SIZE) {
        this.add.image(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 'ground-tile').setDepth(0);
      }
    }

    // Trees
    this.treeGroup = this.physics.add.staticGroup();
    for (let i = 0; i < TREE_COUNT; i++) {
      const tx = Phaser.Math.Between(32, MAP_WIDTH - 32);
      const ty = Phaser.Math.Between(32, MAP_HEIGHT - 32);
      // Don't place trees too close to center (player spawn)
      if (distance(tx, ty, MAP_WIDTH / 2, MAP_HEIGHT / 2) < 100) continue;
      const tree = this.treeGroup.create(tx, ty, 'tree') as Phaser.Physics.Arcade.Sprite;
      tree.setDepth(3);
      tree.setImmovable(true);
      (tree.body as Phaser.Physics.Arcade.StaticBody).setSize(12, 10).setOffset(10, 22);
    }
  }

  private spawnEntities(): void {
    // Scattered star fragments
    for (let i = 0; i < Math.round(FRAGMENT_SCATTER_COUNT * this.difficulty.fragmentDropRate); i++) {
      const x = Phaser.Math.Between(50, MAP_WIDTH - 50);
      const y = Phaser.Math.Between(50, MAP_HEIGHT - 50);
      this.fragments.push(createStarFragment(x, y));
    }

    // Star deposits
    for (let i = 0; i < Math.round(DEPOSIT_COUNT * this.difficulty.depositFrequency); i++) {
      const x = Phaser.Math.Between(100, MAP_WIDTH - 100);
      const y = Phaser.Math.Between(100, MAP_HEIGHT - 100);
      this.deposits.push(createStarDeposit(x, y));
    }

    // Hammer animals
    const speciesList = Object.values(AnimalSpecies);
    const hammerTypes = Object.values(HammerType);
    const enemyCount = Math.round(ENEMY_COUNT * this.difficulty.enemySpawnRate);
    for (let i = 0; i < enemyCount; i++) {
      const x = Phaser.Math.Between(100, MAP_WIDTH - 100);
      const y = Phaser.Math.Between(100, MAP_HEIGHT - 100);
      // Don't spawn too close to player
      if (distance(x, y, MAP_WIDTH / 2, MAP_HEIGHT / 2) < 300) continue;
      const species = speciesList[i % speciesList.length];
      const hammerType = hammerTypes[Math.min(Math.floor(i / speciesList.length), hammerTypes.length - 1)];

      // Generate patrol path
      const patrolPath = [];
      for (let p = 0; p < 4; p++) {
        patrolPath.push({
          x: Phaser.Math.Between(Math.max(50, x - 200), Math.min(MAP_WIDTH - 50, x + 200)),
          y: Phaser.Math.Between(Math.max(50, y - 200), Math.min(MAP_HEIGHT - 50, y + 200)),
        });
      }

      const animal = createHammerAnimal(species, hammerType, x, y, patrolPath);
      // Scale with difficulty
      animal.damage = Math.round(animal.damage * this.difficulty.enemyDamageMultiplier);
      animal.hp = Math.round(animal.hp * this.difficulty.enemyHpMultiplier);
      animal.maxHp = animal.hp;
      this.enemies.push(animal);
    }

    // NPCs
    const dispositions = [NPCDisposition.FRIENDLY, NPCDisposition.NEUTRAL, NPCDisposition.NEUTRAL, NPCDisposition.HOSTILE];
    for (let i = 0; i < NPC_COUNT; i++) {
      const x = Phaser.Math.Between(200, MAP_WIDTH - 200);
      const y = Phaser.Math.Between(200, MAP_HEIGHT - 200);
      this.npcs.push(createNPC(x, y, dispositions[i % dispositions.length]));
    }
  }

  private createVisualEntities(): void {
    for (const frag of this.fragments) {
      this.fragmentSprites.set(frag.id, new StarFragmentSprite(this, frag));
    }
    for (const dep of this.deposits) {
      this.depositSprites.set(dep.id, new StarDepositSprite(this, dep));
    }
    for (const enemy of this.enemies) {
      this.enemySprites.set(enemy.id, new HammerAnimalSprite(this, enemy));
    }
    for (const npc of this.npcs) {
      this.npcSprites.set(npc.id, new NPCSprite(this, npc));
    }
  }

  // --- Input Handling ---

  private inventoryKeyAction(key: string): void {
    if (!this.inventoryUI.isOpen()) return;
    this.inventoryUI.handleKeyboard(key);
    const msg = this.inventoryUI.getLastActionMessage();
    if (msg) this.showMessage(msg);
  }

  private handleMovement(_dt: number): void {
    let vx = 0, vy = 0;

    if (this.wasd.A.isDown || this.cursors.left.isDown) vx = -1;
    if (this.wasd.D.isDown || this.cursors.right.isDown) vx = 1;
    if (this.wasd.W.isDown || this.cursors.up.isDown) vy = -1;
    if (this.wasd.S.isDown || this.cursors.down.isDown) vy = 1;

    // Normalize diagonal
    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }

    const speed = this.playerState.speed;
    this.playerSprite.sprite.setVelocity(vx * speed, vy * speed);

    // Sync core state with physics
    this.playerState.x = this.playerSprite.sprite.x;
    this.playerState.y = this.playerSprite.sprite.y;
  }

  private toggleCloak(): void {
    LightSystem.toggleCloak(this.playerState.lightSource);
    const cloaked = this.playerState.lightSource.isCloaked;
    this.showMessage(cloaked ? '망토를 덮었습니다 (적에게 안 보임)' : '망토를 벗었습니다');
    eventBus.emit('light:toggled', {
      isOn: this.playerState.lightSource.isOn,
      isCloaked: cloaked,
    });
  }

  // --- Fragment Pickup ---

  private checkFragmentPickup(): void {
    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const frag = this.fragments[i];
      const dist = distance(this.playerState.x, this.playerState.y, frag.x, frag.y);
      if (dist < PICKUP_RANGE) {
        if (addFragment(this.inventory, frag)) {
          this.fragments.splice(i, 1);
          const sprite = this.fragmentSprites.get(frag.id);
          sprite?.destroy();
          this.fragmentSprites.delete(frag.id);

          // Auto-use as XP
          const xp = MergeSystem.getXpValue(frag);
          const newLight = ProgressionSystem.addXp(this.playerState, xp);
          if (newLight) {
            this.showMessage(`레벨 업! ${newLight}로 업그레이드`);
          }

          // Refuel slightly
          LightSystem.refuelFromFragment(this.playerState.lightSource, 5);
        }
      }
    }
  }

  // --- Mining ---

  private handleMining(dt: number): void {
    if (this.keyZ.isDown) {
      // Find nearest deposit
      if (!this.currentMiningDeposit) {
        for (const dep of this.deposits) {
          if (dep.isDepleted) continue;
          const dist = distance(this.playerState.x, this.playerState.y, dep.x, dep.y);
          if (dist < MINING_RANGE) {
            this.currentMiningDeposit = dep;
            dep.isBeingMined = true;
            if (!dep.minerIds.includes('player')) {
              dep.minerIds.push('player');
            }
            break;
          }
        }
      }

      if (this.currentMiningDeposit) {
        const minedFragments = MiningSystem.advanceMining(this.currentMiningDeposit, dt);
        this.miningUI.show(this.currentMiningDeposit.currentMiningProgress, this.currentMiningDeposit.miningTimeRequired);

        if (minedFragments.length > 0) {
          // Deposit mined! Scatter fragments nearby
          for (const frag of minedFragments) {
            frag.x = this.currentMiningDeposit.x + Phaser.Math.Between(-30, 30);
            frag.y = this.currentMiningDeposit.y + Phaser.Math.Between(-30, 30);
            this.fragments.push(frag);
            this.fragmentSprites.set(frag.id, new StarFragmentSprite(this, frag));
          }
          this.showMessage(`별조각 ${minedFragments.length}개 발견!`);
          this.miningUI.hide();
          this.currentMiningDeposit = null;
        }
      }
    } else {
      if (this.currentMiningDeposit) {
        this.currentMiningDeposit.isBeingMined = false;
        const idx = this.currentMiningDeposit.minerIds.indexOf('player');
        if (idx !== -1) this.currentMiningDeposit.minerIds.splice(idx, 1);
        this.currentMiningDeposit = null;
        this.miningUI.hide();
      }
    }
  }

  // --- Combat ---

  private playerAttack(): void {
    const stick = this.inventory.starSticks.length > 0 ? this.inventory.starSticks[0] : null;
    const baseDamage = stick ? stick.damage : Phaser.Math.Between(1, 2); // bare hands = 1-2 dmg

    // Show attack animation on player
    this.playerSprite.playAttackAnim();

    // Find nearest enemy in range
    let nearestEnemy: HammerAnimalData | null = null;
    let nearestDist = Infinity;
    for (const enemy of this.enemies) {
      const dist = distance(this.playerState.x, this.playerState.y, enemy.x, enemy.y);
      if (dist < ATTACK_RANGE && dist < nearestDist) {
        nearestDist = dist;
        nearestEnemy = enemy;
      }
    }

    // Also check NPCs in range (for PvP/stealing)
    let nearestNPC: NPCData | null = null;
    for (const npc of this.npcs) {
      const dist = distance(this.playerState.x, this.playerState.y, npc.x, npc.y);
      if (dist < ATTACK_RANGE && dist < nearestDist) {
        nearestDist = dist;
        nearestNPC = npc;
        nearestEnemy = null; // NPC takes priority if closer
      }
    }

    if (nearestEnemy) {
      let damage: number;
      let stickBroken = false;
      if (stick) {
        const result = CombatSystem.playerAttackEnemy(stick, nearestEnemy);
        damage = result.damage;
        stickBroken = result.stickBroken;
      } else {
        damage = baseDamage;
        nearestEnemy.hp -= damage;
      }

      this.cameraSystem.shake();
      eventBus.emit('combat:enemyHit', { enemyId: nearestEnemy.id, damage });

      // Show damage number and hit flash on enemy
      const enemySprite = this.enemySprites.get(nearestEnemy.id);
      if (enemySprite) {
        enemySprite.showHitEffect(damage);
      }

      if (nearestEnemy.hp <= 0) {
        // Remove enemy, drop fragments
        const idx = this.enemies.indexOf(nearestEnemy);
        if (idx !== -1) this.enemies.splice(idx, 1);
        enemySprite?.destroy();
        this.enemySprites.delete(nearestEnemy.id);

        // Drop some fragments
        const dropCount = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < dropCount; i++) {
          const frag = createStarFragment(
            nearestEnemy.x + Phaser.Math.Between(-20, 20),
            nearestEnemy.y + Phaser.Math.Between(-20, 20),
          );
          this.fragments.push(frag);
          this.fragmentSprites.set(frag.id, new StarFragmentSprite(this, frag));
        }
        this.showMessage('망치동물 처치!');
      }

      if (stickBroken) {
        this.inventory.starSticks.splice(0, 1);
        this.showMessage('별 막대기가 부서졌습니다!');
      }
    } else if (nearestNPC) {
      // Attack NPC - steal fragments, gain hammer score
      this.playerState.hammerScore += 3;
      const stolen = Math.min(2, nearestNPC.inventory.pouches[0]?.fragments.length ?? 0);
      this.showMessage(`NPC 공격! 망치점수 +3${stolen > 0 ? `, 별조각 ${stolen}개 약탈` : ''}`);
      nearestNPC.trustOfPlayer -= 30;
      nearestNPC.currentAction = NPCAction.FLEEING;
      if (stick) {
        stick.durability -= 1;
        if (stick.durability <= 0) {
          this.inventory.starSticks.splice(0, 1);
        }
      }
    } else {
      this.showMessage('공격 범위에 대상이 없습니다');
    }
  }

  // --- NPC Interaction ---

  private handleNPCInteraction(_dt: number): void {
    for (const npc of this.npcs) {
      const dist = distance(this.playerState.x, this.playerState.y, npc.x, npc.y);

      // Simple NPC wandering
      if (npc.currentAction === NPCAction.IDLE) {
        // Occasionally start moving
        if (Math.random() < 0.005) {
          npc.x += Phaser.Math.Between(-20, 20);
          npc.y += Phaser.Math.Between(-20, 20);
          npc.x = Phaser.Math.Clamp(npc.x, 50, MAP_WIDTH - 50);
          npc.y = Phaser.Math.Clamp(npc.y, 50, MAP_HEIGHT - 50);
        }
      } else if (npc.currentAction === NPCAction.FLEEING) {
        // Move away from player
        const dx = npc.x - this.playerState.x;
        const dy = npc.y - this.playerState.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        npc.x += (dx / d) * 2;
        npc.y += (dy / d) * 2;
        if (dist > 200) {
          npc.currentAction = NPCAction.IDLE;
        }
      }

      // Auto-cooperate at mining deposits
      if (dist < NPC_INTERACT_RANGE && this.currentMiningDeposit && npc.currentAction === NPCAction.IDLE) {
        if (npc.trustOfPlayer > -10) {
          const npcAction = CooperationSystem.decideNPCAction(npc.trustOfPlayer);
          if (npcAction === 'cooperate') {
            // NPC helps mine
            if (!this.currentMiningDeposit.minerIds.includes(npc.id)) {
              this.currentMiningDeposit.minerIds.push(npc.id);
              npc.currentAction = NPCAction.COOPERATING;
              npc.trustOfPlayer += 5;
              this.playerState.lightScore += 2;
              this.showMessage('NPC가 채굴을 돕습니다! 빛점수 +2');
            }
          }
        }
      }

      // Reset NPC mining when deposit is done
      if (npc.currentAction === NPCAction.COOPERATING && (!this.currentMiningDeposit || this.currentMiningDeposit.isDepleted)) {
        npc.currentAction = NPCAction.IDLE;
      }
    }
  }

  // --- Enemy Updates ---

  private updateEnemies(dt: number): void {
    for (const enemy of this.enemies) {
      const result = AISystem.updateAnimal(enemy, this.playerState, dt);

      if (result.shouldAttack) {
        const combat = CombatSystem.enemyAttackPlayer(enemy, this.playerState, this.difficulty.enemyDamageMultiplier);
        this.cameraSystem.shake(0.008, 300);
        eventBus.emit('combat:playerHit', { damage: combat.damage });
        this.showMessage(`${enemy.species} 공격! -${combat.damage} HP`);

        // Visual effects
        const sprite = this.enemySprites.get(enemy.id);
        sprite?.playAttackAnim();
        this.playerSprite.showHitEffect(combat.damage);

        if (combat.playerDead) {
          this.playerDeath();
          return;
        }
      }

      // Update sprite
      const sprite = this.enemySprites.get(enemy.id);
      sprite?.update(enemy);
    }
  }

  // --- Player Death ---

  private playerDeath(): void {
    this.playerState.isAlive = false;
    eventBus.emit('player:died', {});
    this.showMessage('불이 꺼졌습니다...');

    // Drop all items at death location
    const pouch = this.inventory.pouches[0];
    for (const frag of pouch.fragments) {
      frag.x = this.playerState.x + Phaser.Math.Between(-40, 40);
      frag.y = this.playerState.y + Phaser.Math.Between(-40, 40);
      this.fragments.push(frag);
      this.fragmentSprites.set(frag.id, new StarFragmentSprite(this, frag));
    }
    pouch.fragments = [];

    this.time.delayedCall(2500, () => {
      this.scene.start('GameOverScene', { difficulty: this.difficulty.level });
    });
  }

  // --- Visual Updates ---

  private updateVisuals(): void {
    // Player sprite
    this.playerSprite.update(this.playerState, this.difficulty.moonBrightness);

    // Deposit sprites
    for (const dep of this.deposits) {
      const sprite = this.depositSprites.get(dep.id);
      sprite?.update(dep);
    }

    // NPC sprites
    for (const npc of this.npcs) {
      const sprite = this.npcSprites.get(npc.id);
      sprite?.update(npc);
    }

    // HUD
    this.hud.update(this.playerState, this.inventory);
  }

  // --- Helpers ---

  private showMessage(text: string, duration: number = 2.5): void {
    this.messageText.setText(text);
    this.messageText.setAlpha(1);
    this.messageTimer = duration;
  }
}
