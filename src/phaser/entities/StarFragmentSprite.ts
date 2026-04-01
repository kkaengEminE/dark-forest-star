import Phaser from 'phaser';
import type { StarFragmentData } from '../../core/models/StarFragment';

export class StarFragmentSprite {
  sprite: Phaser.GameObjects.Sprite;
  readonly id: string;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, data: StarFragmentData) {
    this.scene = scene;
    this.id = data.id;

    this.sprite = scene.add.sprite(data.x, data.y, 'star-fragment');
    this.sprite.setDepth(5);

    // Gentle twinkling
    scene.tweens.add({
      targets: this.sprite,
      alpha: { from: 0.6, to: 1 },
      duration: 800 + Math.random() * 600,
      yoyo: true,
      repeat: -1,
    });
  }

  destroy(): void {
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.destroy();
  }
}
