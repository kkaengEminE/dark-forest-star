import Phaser from 'phaser';
import { type PlayerState, LightSourceType } from '../../core/models/Player';
import { LightSystem } from '../../core/systems/LightSystem';

const TEXTURE_MAP: Record<LightSourceType, string> = {
  [LightSourceType.CANDLE]: 'player-candle',
  [LightSourceType.LIGHT_BULB]: 'player-bulb',
  [LightSourceType.LED]: 'player-led',
  [LightSourceType.SPOTLIGHT]: 'player-led',
  [LightSourceType.FLOODLIGHT]: 'player-led',
};

export class PlayerSprite {
  sprite: Phaser.Physics.Arcade.Sprite;
  private glowCircle: Phaser.GameObjects.Graphics;
  private attackArc: Phaser.GameObjects.Graphics;
  private scene: Phaser.Scene;
  private isAttacking = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.sprite = scene.physics.add.sprite(x, y, 'player-candle');
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(10);
    this.sprite.setScale(1.5);

    this.glowCircle = scene.add.graphics();
    this.glowCircle.setDepth(9);

    this.attackArc = scene.add.graphics();
    this.attackArc.setDepth(12);
  }

  update(state: PlayerState, moonBrightness: number): void {
    // Update texture based on light type
    const texKey = TEXTURE_MAP[state.lightSource.type];
    if (this.sprite.texture.key !== texKey) {
      this.sprite.setTexture(texKey);
    }

    // Draw glow circle around player
    this.glowCircle.clear();
    const range = LightSystem.getEffectiveRange(state.lightSource, moonBrightness);

    if (state.lightSource.isOn && !state.lightSource.isCloaked && state.lightSource.fuel > 0) {
      // Warm glow
      const alpha = state.lightSource.brightness * 0.08;
      this.glowCircle.fillStyle(0xffcc44, alpha);
      this.glowCircle.fillCircle(this.sprite.x, this.sprite.y, range * 0.8);
      this.glowCircle.fillStyle(0xffaa22, alpha * 0.5);
      this.glowCircle.fillCircle(this.sprite.x, this.sprite.y, range * 0.4);
    }

    // Dim flicker when low fuel
    if (state.lightSource.fuel < state.lightSource.maxFuel * 0.2 && state.lightSource.isOn) {
      this.sprite.setAlpha(0.7 + Math.random() * 0.3);
    } else if (state.lightSource.isCloaked) {
      this.sprite.setAlpha(0.3);
    } else {
      this.sprite.setAlpha(1);
    }
  }

  playAttackAnim(): void {
    if (this.isAttacking) return;
    this.isAttacking = true;

    // Draw a sweeping arc around the player
    const x = this.sprite.x;
    const y = this.sprite.y;
    const radius = 35;

    this.attackArc.clear();
    this.attackArc.lineStyle(3, 0xffdd44, 0.9);
    this.attackArc.beginPath();
    this.attackArc.arc(x, y, radius, -Math.PI * 0.3, Math.PI * 0.3, false);
    this.attackArc.strokePath();

    // Fade out after 250ms
    this.scene.tweens.add({
      targets: this.attackArc,
      alpha: 0,
      duration: 250,
      onComplete: () => {
        this.attackArc.clear();
        this.attackArc.setAlpha(1);
        this.isAttacking = false;
      },
    });
  }

  showHitEffect(damage: number): void {
    // Red tint flash
    this.sprite.setTint(0xff2222);
    this.scene.time.delayedCall(200, () => {
      this.sprite.clearTint();
    });

    // Floating damage number
    const dmgText = this.scene.add.text(this.sprite.x, this.sprite.y - 20, `-${damage}`, {
      fontSize: '16px',
      color: '#ff4444',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(100);

    this.scene.tweens.add({
      targets: dmgText,
      y: dmgText.y - 40,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => dmgText.destroy(),
    });
  }

  destroy(): void {
    this.sprite.destroy();
    this.glowCircle.destroy();
    this.attackArc.destroy();
  }
}
