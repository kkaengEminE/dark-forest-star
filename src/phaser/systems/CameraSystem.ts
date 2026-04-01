import Phaser from 'phaser';
import { MAP_WIDTH, MAP_HEIGHT } from '../../core/constants/GameConstants';

export class CameraSystem {
  private camera: Phaser.Cameras.Scene2D.Camera;

  constructor(scene: Phaser.Scene, target: Phaser.GameObjects.Sprite) {
    this.camera = scene.cameras.main;
    this.camera.startFollow(target, true, 0.08, 0.08);
    this.camera.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    this.camera.setBackgroundColor('#050a14');
  }

  shake(intensity: number = 0.005, duration: number = 200): void {
    this.camera.shake(duration, intensity);
  }

  getWorldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: worldX - this.camera.scrollX,
      y: worldY - this.camera.scrollY,
    };
  }
}
