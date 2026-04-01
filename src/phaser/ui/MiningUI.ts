import Phaser from 'phaser';

export class MiningUI {
  private bar: Phaser.GameObjects.Graphics;
  private visible = false;

  constructor(scene: Phaser.Scene) {
    this.bar = scene.add.graphics();
    this.bar.setScrollFactor(0);
    this.bar.setDepth(1101);
  }

  show(progress: number, total: number): void {
    this.visible = true;
    const pct = progress / total;
    const cx = 480, cy = 560;
    const w = 160, h = 8;

    this.bar.clear();
    this.bar.fillStyle(0x222222, 0.8);
    this.bar.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 4);
    this.bar.fillStyle(0xffcc44, 1);
    this.bar.fillRoundedRect(cx - w / 2, cy - h / 2, w * pct, h, 4);
    this.bar.lineStyle(1, 0x888844);
    this.bar.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 4);
  }

  hide(): void {
    this.visible = false;
    this.bar.clear();
  }

  destroy(): void {
    this.bar.destroy();
  }
}
