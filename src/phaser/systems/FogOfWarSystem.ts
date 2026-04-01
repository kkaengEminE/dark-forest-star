import Phaser from 'phaser';
import { FOG_COLOR } from '../../core/constants/GameConstants';

export class FogOfWarSystem {
  private fogOverlay: Phaser.GameObjects.RenderTexture;
  private visionMask: Phaser.GameObjects.Image;
  private fogAlpha = 0.95;

  constructor(scene: Phaser.Scene) {
    const { width, height } = scene.scale;

    // Full-screen dark overlay — origin at (0,0) so it aligns to top-left corner
    this.fogOverlay = scene.add.renderTexture(0, 0, width, height);
    this.fogOverlay.setOrigin(0, 0);
    this.fogOverlay.setScrollFactor(0);
    this.fogOverlay.setDepth(1000);

    // Fill initially
    this.fogOverlay.fill(FOG_COLOR, this.fogAlpha);

    // Vision mask - soft gradient circle (not added to display list)
    this.visionMask = new Phaser.GameObjects.Image(scene, width / 2, height / 2, 'vision-mask');

    const mask = new Phaser.Display.Masks.BitmapMask(scene, this.visionMask);
    mask.invertAlpha = true;
    this.fogOverlay.setMask(mask);
  }

  update(playerScreenX: number, playerScreenY: number, visibilityRadius: number): void {
    // Re-fill fog every frame to ensure full coverage (prevents stale rect artifacts)
    this.fogOverlay.fill(FOG_COLOR, this.fogAlpha);

    this.visionMask.x = playerScreenX;
    this.visionMask.y = playerScreenY;

    const baseSize = 512; // matches vision-mask texture size
    const scale = (visibilityRadius * 2.5) / baseSize;
    this.visionMask.setScale(Math.max(0.1, scale));
  }

  setDarkness(density: number): void {
    this.fogAlpha = Math.min(1, 0.85 + density * 0.1);
    this.fogOverlay.fill(FOG_COLOR, this.fogAlpha);
  }

  destroy(): void {
    this.fogOverlay.destroy();
    this.visionMask.destroy();
  }
}
