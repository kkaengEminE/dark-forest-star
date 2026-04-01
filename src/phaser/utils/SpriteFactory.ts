import Phaser from 'phaser';
import { AnimalSpecies } from '../../core/models/HammerAnimal';

function makeGraphics(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.setVisible(false);
  return g;
}

export class SpriteFactory {
  static generateAll(scene: Phaser.Scene): void {
    this.generatePlayerCandle(scene);
    this.generatePlayerBulb(scene);
    this.generatePlayerLED(scene);
    this.generateTree(scene);
    this.generateStarFragment(scene);
    this.generateStarDeposit(scene);
    this.generateStarStick(scene);
    this.generateNPC(scene);
    for (const species of Object.values(AnimalSpecies)) {
      this.generateHammerAnimal(scene, species);
    }
    this.generateGroundTile(scene);
    this.generateMoonGlow(scene);
  }

  static generateVisionMask(scene: Phaser.Scene): void {
    const size = 512;
    const g = makeGraphics(scene);
    for (let r = size / 2; r > 0; r -= 1) {
      const alpha = (r / (size / 2));
      g.fillStyle(0xffffff, alpha * alpha); // quadratic falloff for softer edge
      g.fillCircle(size / 2, size / 2, r);
    }
    g.generateTexture('vision-mask', size, size);
    g.destroy();
  }

  static generatePlayerCandle(scene: Phaser.Scene): void {
    const g = makeGraphics(scene);
    // Body (wax)
    g.fillStyle(0xf5e6c8, 1);
    g.fillRect(5, 8, 6, 10);
    // Flame outer
    g.fillStyle(0xff8844, 0.8);
    g.fillCircle(8, 6, 4);
    // Flame inner
    g.fillStyle(0xffcc44, 1);
    g.fillCircle(8, 5, 2);
    // Glow
    g.fillStyle(0xffaa22, 0.15);
    g.fillCircle(8, 8, 8);
    g.generateTexture('player-candle', 16, 18);
    g.destroy();
  }

  static generatePlayerBulb(scene: Phaser.Scene): void {
    const g = makeGraphics(scene);
    // Bulb body
    g.fillStyle(0xffffdd, 0.9);
    g.fillCircle(8, 7, 5);
    // Base
    g.fillStyle(0x888888, 1);
    g.fillRect(6, 12, 4, 4);
    // Filament glow
    g.fillStyle(0xffdd66, 0.3);
    g.fillCircle(8, 7, 7);
    g.generateTexture('player-bulb', 16, 18);
    g.destroy();
  }

  static generatePlayerLED(scene: Phaser.Scene): void {
    const g = makeGraphics(scene);
    // LED body
    g.fillStyle(0xddddff, 1);
    g.fillCircle(8, 8, 4);
    // Bright center
    g.fillStyle(0xffffff, 1);
    g.fillCircle(8, 8, 2);
    // Blue glow
    g.fillStyle(0x8888ff, 0.2);
    g.fillCircle(8, 8, 8);
    g.generateTexture('player-led', 16, 16);
    g.destroy();
  }

  static generateTree(scene: Phaser.Scene): void {
    const g = makeGraphics(scene);
    // Trunk
    g.fillStyle(0x1a120a, 1);
    g.fillRect(12, 22, 8, 10);
    // Foliage layers (dark, barely visible)
    g.fillStyle(0x0a1a0a, 0.9);
    g.fillCircle(16, 16, 13);
    g.fillStyle(0x0c1e0c, 0.7);
    g.fillCircle(16, 12, 10);
    g.generateTexture('tree', 32, 32);
    g.destroy();
  }

  static generateStarFragment(scene: Phaser.Scene): void {
    const g = makeGraphics(scene);
    // Star glow
    g.fillStyle(0xffffaa, 0.3);
    g.fillCircle(6, 6, 6);
    // Star body (4-pointed)
    g.fillStyle(0xffffcc, 1);
    g.fillTriangle(6, 0, 8, 6, 4, 6);   // top
    g.fillTriangle(6, 12, 8, 6, 4, 6);  // bottom
    g.fillTriangle(0, 6, 6, 4, 6, 8);   // left
    g.fillTriangle(12, 6, 6, 4, 6, 8);  // right
    g.generateTexture('star-fragment', 12, 12);
    g.destroy();
  }

  static generateStarDeposit(scene: Phaser.Scene): void {
    const g = makeGraphics(scene);
    // Rock body
    g.fillStyle(0x2a2a3a, 1);
    g.fillRoundedRect(2, 8, 28, 20, 4);
    // Star veins
    g.fillStyle(0xaaaa44, 0.6);
    g.fillCircle(10, 16, 3);
    g.fillCircle(20, 18, 2);
    g.fillCircle(16, 12, 2);
    // Sparkle
    g.fillStyle(0xffffaa, 0.8);
    g.fillCircle(10, 16, 1);
    g.fillCircle(20, 18, 1);
    g.generateTexture('star-deposit', 32, 28);
    g.destroy();
  }

  static generateStarStick(scene: Phaser.Scene): void {
    const g = makeGraphics(scene);
    // Stick shaft
    g.fillStyle(0xccaa44, 1);
    g.fillRect(3, 2, 2, 12);
    // Star tip
    g.fillStyle(0xffff88, 1);
    g.fillCircle(4, 2, 3);
    g.generateTexture('star-stick', 8, 16);
    g.destroy();
  }

  static generateHammerAnimal(scene: Phaser.Scene, species: AnimalSpecies): void {
    const g = makeGraphics(scene);

    const colors: Record<AnimalSpecies, number> = {
      [AnimalSpecies.HAMMER_BIRD]:     0x554433,
      [AnimalSpecies.HAMMER_WOLF]:     0x444455,
      [AnimalSpecies.HAMMER_BEAR]:     0x3a2a1a,
      [AnimalSpecies.HAMMER_TIGER]:    0x664422,
      [AnimalSpecies.HAMMER_ELEPHANT]: 0x555566,
    };

    const sizes: Record<AnimalSpecies, number> = {
      [AnimalSpecies.HAMMER_BIRD]:     0.6,
      [AnimalSpecies.HAMMER_WOLF]:     0.8,
      [AnimalSpecies.HAMMER_BEAR]:     1.2,
      [AnimalSpecies.HAMMER_TIGER]:    1.0,
      [AnimalSpecies.HAMMER_ELEPHANT]: 1.5,
    };

    const s = sizes[species];
    const cx = 16, cy = 16;

    // Body
    g.fillStyle(colors[species], 1);
    g.fillEllipse(cx, cy + 2 * s, 12 * s, 8 * s);

    // Hammer head
    g.fillStyle(0x888888, 1);
    g.fillRect(cx - 6 * s, cy - 8 * s, 12 * s, 6 * s);

    // Handle
    g.fillStyle(0x664422, 1);
    g.fillRect(cx - 1, cy - 2 * s, 2, 4 * s);

    // Eyes (red, menacing)
    g.fillStyle(0xff2222, 1);
    g.fillCircle(cx - 3 * s, cy - 4 * s, 1.5);
    g.fillCircle(cx + 3 * s, cy - 4 * s, 1.5);

    g.generateTexture(`enemy-${species}`, 32, 32);
    g.destroy();
  }

  static generateNPC(scene: Phaser.Scene): void {
    const g = makeGraphics(scene);
    // Body
    g.fillStyle(0xaabb99, 0.8);
    g.fillCircle(8, 10, 6);
    // Light (smaller candle)
    g.fillStyle(0xffaa44, 0.6);
    g.fillCircle(8, 4, 3);
    g.generateTexture('npc', 16, 16);
    g.destroy();
  }

  static generateGroundTile(scene: Phaser.Scene): void {
    const g = makeGraphics(scene);
    // Dark earth with slight variation
    g.fillStyle(0x0c100c, 1);
    g.fillRect(0, 0, 32, 32);
    // Subtle texture dots
    g.fillStyle(0x0e130e, 1);
    g.fillRect(4, 4, 2, 2);
    g.fillRect(20, 12, 2, 2);
    g.fillRect(12, 24, 2, 2);
    g.fillRect(26, 28, 2, 2);
    g.generateTexture('ground-tile', 32, 32);
    g.destroy();
  }

  static generateMoonGlow(scene: Phaser.Scene): void {
    const size = 128;
    const g = makeGraphics(scene);
    for (let r = size / 2; r > 0; r -= 2) {
      const alpha = (r / (size / 2)) * 0.15;
      g.fillStyle(0xccccdd, alpha);
      g.fillCircle(size / 2, size / 2, r);
    }
    // Moon disc
    g.fillStyle(0xddddcc, 0.3);
    g.fillCircle(size / 2, size / 2, 8);
    g.generateTexture('moon-glow', size, size);
    g.destroy();
  }
}
