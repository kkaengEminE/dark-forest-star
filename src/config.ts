import Phaser from 'phaser';
import { BootScene } from './phaser/scenes/BootScene';
import { TitleScene } from './phaser/scenes/TitleScene';
import { GameScene } from './phaser/scenes/GameScene';
import { InventoryScene } from './phaser/scenes/InventoryScene';
import { GameOverScene } from './phaser/scenes/GameOverScene';
import { EndingScene } from './phaser/scenes/EndingScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  width: 960,
  height: 640,
  parent: 'game-container',
  backgroundColor: '#000000',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, TitleScene, GameScene, InventoryScene, GameOverScene, EndingScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};
