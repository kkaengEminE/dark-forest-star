import Phaser from 'phaser';
import { type NPCData, NPCDisposition } from '../../core/models/NPC';

const DISPOSITION_COLORS: Record<NPCDisposition, number> = {
  [NPCDisposition.FRIENDLY]: 0x44ff44,
  [NPCDisposition.NEUTRAL]:  0xffff44,
  [NPCDisposition.HOSTILE]:  0xff4444,
};

export class NPCSprite {
  sprite: Phaser.GameObjects.Sprite;
  private dispositionDot: Phaser.GameObjects.Graphics;
  readonly id: string;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, data: NPCData) {
    this.scene = scene;
    this.id = data.id;

    this.sprite = scene.add.sprite(data.x, data.y, 'npc');
    this.sprite.setDepth(9);

    this.dispositionDot = scene.add.graphics();
    this.dispositionDot.setDepth(11);
  }

  update(data: NPCData): void {
    this.sprite.x = data.x;
    this.sprite.y = data.y;

    this.dispositionDot.clear();
    const color = DISPOSITION_COLORS[data.disposition];
    this.dispositionDot.fillStyle(color, 0.8);
    this.dispositionDot.fillCircle(data.x, data.y - 14, 2);
  }

  destroy(): void {
    this.sprite.destroy();
    this.dispositionDot.destroy();
  }
}
