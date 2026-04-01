import Phaser from 'phaser';

// This scene is currently unused - inventory is handled as an overlay in GameScene
// via InventoryUI. This scene is reserved for future expansion into a full
// standalone inventory scene if needed.

export class InventoryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'InventoryScene' });
  }

  create(): void {
    // Placeholder - inventory currently handled by InventoryUI overlay in GameScene
  }
}
