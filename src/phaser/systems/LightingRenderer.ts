import Phaser from 'phaser';

export class LightingRenderer {
  private moonImage: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, moonBrightness: number) {
    const { width } = scene.scale;

    // Moon in top-right corner (above fog so it's always faintly visible)
    this.moonImage = scene.add.image(width - 60, 50, 'moon-glow');
    this.moonImage.setScrollFactor(0);
    this.moonImage.setDepth(1050);
    this.moonImage.setAlpha(moonBrightness * 0.4);
    this.moonImage.setScale(1.2);

    // Moon gentle pulsing
    scene.tweens.add({
      targets: this.moonImage,
      alpha: moonBrightness * 0.25,
      duration: 5000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  setMoonBrightness(brightness: number): void {
    this.moonImage.setAlpha(brightness * 0.4);
  }

  destroy(): void {
    this.moonImage.destroy();
  }
}
