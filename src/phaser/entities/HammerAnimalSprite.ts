import Phaser from 'phaser';
import { type HammerAnimalData, AnimalState } from '../../core/models/HammerAnimal';

const STATE_TINTS: Record<AnimalState, number> = {
  [AnimalState.ROAMING]:    0xffffff,
  [AnimalState.ALERT]:      0xffff44,
  [AnimalState.CHARGING]:   0xff6644,
  [AnimalState.ATTACKING]:  0xff2222,
  [AnimalState.RETREATING]: 0x8888ff,
};

export class HammerAnimalSprite {
  sprite: Phaser.GameObjects.Sprite;
  private alertIcon: Phaser.GameObjects.Text;
  private attackGraphic: Phaser.GameObjects.Graphics;
  private scene: Phaser.Scene;
  readonly id: string;

  constructor(scene: Phaser.Scene, data: HammerAnimalData) {
    this.scene = scene;
    this.id = data.id;

    this.sprite = scene.add.sprite(data.x, data.y, `enemy-${data.species}`);
    this.sprite.setDepth(8);

    this.alertIcon = scene.add.text(data.x, data.y - 20, '', {
      fontSize: '16px',
      color: '#ff4444',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(11);

    this.attackGraphic = scene.add.graphics();
    this.attackGraphic.setDepth(12);
  }

  update(data: HammerAnimalData): void {
    this.sprite.x = data.x;
    this.sprite.y = data.y;
    this.sprite.setTint(STATE_TINTS[data.state]);

    this.alertIcon.x = data.x;
    this.alertIcon.y = data.y - 20;

    switch (data.state) {
      case AnimalState.ALERT:
        this.alertIcon.setText('!');
        break;
      case AnimalState.CHARGING:
      case AnimalState.ATTACKING:
        this.alertIcon.setText('!!');
        break;
      default:
        this.alertIcon.setText('');
    }
  }

  playAttackAnim(): void {
    const x = this.sprite.x;
    const y = this.sprite.y;

    // Draw hammer swing arc
    this.attackGraphic.clear();
    this.attackGraphic.lineStyle(4, 0xff4444, 0.8);
    this.attackGraphic.beginPath();
    this.attackGraphic.arc(x, y, 30, -Math.PI * 0.5, Math.PI * 0.5, false);
    this.attackGraphic.strokePath();

    // Small hammer head at end of arc
    this.attackGraphic.fillStyle(0xff2222, 0.9);
    this.attackGraphic.fillRect(x + 24, y - 8, 12, 16);

    this.scene.tweens.add({
      targets: this.attackGraphic,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        this.attackGraphic.clear();
        this.attackGraphic.setAlpha(1);
      },
    });
  }

  showHitEffect(damage: number): void {
    // White flash
    this.sprite.setTint(0xffffff);
    this.scene.time.delayedCall(100, () => {
      this.sprite.setTint(0xff8888);
      this.scene.time.delayedCall(100, () => {
        this.sprite.clearTint();
      });
    });

    // Floating damage number
    const dmgText = this.scene.add.text(this.sprite.x, this.sprite.y - 20, `-${damage}`, {
      fontSize: '14px',
      color: '#ffff44',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(100);

    this.scene.tweens.add({
      targets: dmgText,
      y: dmgText.y - 35,
      alpha: 0,
      duration: 700,
      ease: 'Cubic.easeOut',
      onComplete: () => dmgText.destroy(),
    });
  }

  destroy(): void {
    this.sprite.destroy();
    this.alertIcon.destroy();
    this.attackGraphic.destroy();
  }
}
