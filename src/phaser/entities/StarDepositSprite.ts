import Phaser from 'phaser';
import type { StarDepositData } from '../../core/models/StarFragment';

export class StarDepositSprite {
  sprite: Phaser.GameObjects.Sprite;
  private progressBar: Phaser.GameObjects.Graphics;
  readonly id: string;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, data: StarDepositData) {
    this.scene = scene;
    this.id = data.id;

    this.sprite = scene.add.sprite(data.x, data.y, 'star-deposit');
    this.sprite.setDepth(4);

    this.progressBar = scene.add.graphics();
    this.progressBar.setDepth(12);
  }

  update(data: StarDepositData): void {
    this.progressBar.clear();

    if (data.isDepleted) {
      this.sprite.setAlpha(0.3);
      return;
    }

    if (data.isBeingMined && data.currentMiningProgress > 0) {
      const barWidth = 30;
      const barHeight = 4;
      const x = data.x - barWidth / 2;
      const y = data.y - 20;
      const progress = data.currentMiningProgress / data.miningTimeRequired;

      // Background
      this.progressBar.fillStyle(0x333333, 0.8);
      this.progressBar.fillRect(x, y, barWidth, barHeight);
      // Fill
      this.progressBar.fillStyle(0xffcc44, 1);
      this.progressBar.fillRect(x, y, barWidth * progress, barHeight);
    }
  }

  destroy(): void {
    this.sprite.destroy();
    this.progressBar.destroy();
  }
}
