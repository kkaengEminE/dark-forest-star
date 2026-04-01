import Phaser from 'phaser';
import { SpriteFactory } from '../utils/SpriteFactory';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    SpriteFactory.generateAll(this);
    this.scene.start('TitleScene');
  }
}
