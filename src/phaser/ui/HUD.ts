import Phaser from 'phaser';
import type { PlayerState } from '../../core/models/Player';
import { getTotalFragmentCount, type InventoryState } from '../../core/models/Inventory';

export class HUD {
  private container: Phaser.GameObjects.Container;
  private hpBar: Phaser.GameObjects.Graphics;
  private fuelBar: Phaser.GameObjects.Graphics;
  private statusText: Phaser.GameObjects.Text;
  private fragmentText: Phaser.GameObjects.Text;
  private controlsText: Phaser.GameObjects.Text;
  private miningText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.container = scene.add.container(0, 0);
    this.container.setScrollFactor(0);
    this.container.setDepth(1100);

    // Background bar
    const bg = scene.add.graphics();
    bg.fillStyle(0x000000, 0.6);
    bg.fillRect(0, 0, 960, 36);
    this.container.add(bg);

    // HP bar
    this.hpBar = scene.add.graphics();
    this.container.add(this.hpBar);

    // Fuel bar
    this.fuelBar = scene.add.graphics();
    this.container.add(this.fuelBar);

    // Status text
    this.statusText = scene.add.text(400, 8, '', {
      fontSize: '11px',
      color: '#ccccaa',
      fontFamily: 'monospace',
    });
    this.container.add(this.statusText);

    // Fragment count
    this.fragmentText = scene.add.text(650, 8, '', {
      fontSize: '11px',
      color: '#ffffaa',
      fontFamily: 'monospace',
    });
    this.container.add(this.fragmentText);

    // Controls hint at bottom
    const bottomBg = scene.add.graphics();
    bottomBg.fillStyle(0x000000, 0.4);
    bottomBg.fillRect(0, 616, 960, 24);
    this.container.add(bottomBg);

    this.controlsText = scene.add.text(480, 620, '[WASD] 이동  [Q] 망토  [Z] 채굴  [SPACE] 공격  [E] 인벤토리', {
      fontSize: '10px',
      color: '#666655',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0);
    this.container.add(this.controlsText);

    // Mining text (hidden by default)
    this.miningText = scene.add.text(480, 560, '', {
      fontSize: '13px',
      color: '#ffcc44',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0);
    this.container.add(this.miningText);
  }

  update(player: PlayerState, inventory: InventoryState): void {
    // HP Bar
    this.hpBar.clear();
    const hpPct = player.hp / player.maxHp;
    this.hpBar.fillStyle(0x333333, 1);
    this.hpBar.fillRect(10, 10, 120, 12);
    const hpColor = hpPct > 0.5 ? 0x44aa44 : hpPct > 0.25 ? 0xaaaa44 : 0xaa4444;
    this.hpBar.fillStyle(hpColor, 1);
    this.hpBar.fillRect(10, 10, 120 * hpPct, 12);
    this.hpBar.lineStyle(1, 0x666666);
    this.hpBar.strokeRect(10, 10, 120, 12);

    // Fuel Bar
    this.fuelBar.clear();
    const fuelPct = player.lightSource.fuel / player.lightSource.maxFuel;
    this.fuelBar.fillStyle(0x333333, 1);
    this.fuelBar.fillRect(140, 10, 100, 12);
    this.fuelBar.fillStyle(0x4488cc, 1);
    this.fuelBar.fillRect(140, 10, 100 * fuelPct, 12);
    this.fuelBar.lineStyle(1, 0x666666);
    this.fuelBar.strokeRect(140, 10, 100, 12);

    // Status
    const lightStatus = player.lightSource.isCloaked ? '망토' : player.lightSource.isOn ? 'ON' : 'OFF';
    this.statusText.setText(
      `Lv${player.level} ${player.lightSource.type}  빛:${lightStatus}  HP:${Math.ceil(player.hp)}/${player.maxHp}`
    );

    // Fragment count
    const count = getTotalFragmentCount(inventory);
    this.fragmentText.setText(`★ ${count}`);
  }

  showMiningProgress(progress: number, total: number): void {
    const pct = Math.floor((progress / total) * 100);
    this.miningText.setText(`채굴 중... ${pct}%`);
    this.miningText.setAlpha(1);
  }

  hideMiningProgress(): void {
    this.miningText.setAlpha(0);
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
