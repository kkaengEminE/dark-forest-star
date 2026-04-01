import Phaser from 'phaser';
import type { InventoryState } from '../../core/models/Inventory';
import type { PlayerState } from '../../core/models/Player';
import { FragmentTier } from '../../core/models/StarFragment';
import { MergeSystem } from '../../core/systems/MergeSystem';
import { CombatSystem } from '../../core/systems/CombatSystem';
import { ProgressionSystem } from '../../core/systems/ProgressionSystem';
import { getActivePouch, addFragment } from '../../core/models/Inventory';
import { MERGE_COUNT, STICK_CRAFT_COUNT } from '../../core/constants/GameConstants';
import { eventBus } from '../../core/events/EventBus';

const TIER_COLORS: Record<FragmentTier, string> = {
  [FragmentTier.RAW]: '#ffffaa',
  [FragmentTier.MERGED]: '#ffaa44',
  [FragmentTier.SUPER_MERGED]: '#ff44ff',
};

const TIER_LABELS: Record<FragmentTier, string> = {
  [FragmentTier.RAW]: '★',
  [FragmentTier.MERGED]: '✦',
  [FragmentTier.SUPER_MERGED]: '✧',
};

export class InventoryUI {
  private container: Phaser.GameObjects.Container;
  private scene: Phaser.Scene;
  private inventory: InventoryState;
  private playerState: PlayerState | null = null;
  private slotTexts: Phaser.GameObjects.Text[] = [];
  private lastActionMessage = '';

  constructor(scene: Phaser.Scene, inventory: InventoryState) {
    this.scene = scene;
    this.inventory = inventory;
    this.container = scene.add.container(0, 0);
    this.container.setScrollFactor(0);
    this.container.setDepth(2000);
    this.container.setVisible(false);
  }

  setPlayerState(player: PlayerState): void {
    this.playerState = player;
  }

  toggle(): void {
    this.container.setVisible(!this.container.visible);
    if (this.container.visible) {
      this.refresh();
    }
  }

  isOpen(): boolean {
    return this.container.visible;
  }

  getLastActionMessage(): string {
    const msg = this.lastActionMessage;
    this.lastActionMessage = '';
    return msg;
  }

  /** Call from GameScene when inventory is open and a key is pressed */
  handleKeyboard(keyCode: string): void {
    if (!this.container.visible) return;
    switch (keyCode) {
      case 'ONE': this.mergeRaw(); break;
      case 'TWO': this.craftStick(); break;
      case 'THREE': this.useFragmentsAsXP(); break;
      case 'FOUR': this.useFragmentsAsHP(); break;
    }
  }

  refresh(): void {
    this.container.removeAll(true);
    this.slotTexts = [];

    const { width, height } = this.scene.scale;
    const panelW = 400, panelH = 480;
    const px = (width - panelW) / 2, py = (height - panelH) / 2;

    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x111122, 0.92);
    bg.fillRoundedRect(px, py, panelW, panelH, 8);
    bg.lineStyle(1, 0x444444);
    bg.strokeRoundedRect(px, py, panelW, panelH, 8);
    this.container.add(bg);

    const pouch = getActivePouch(this.inventory);

    // Title
    const title = this.scene.add.text(px + panelW / 2, py + 20, `별 주머니 (${pouch.fragments.length}/${pouch.capacity})`, {
      fontSize: '14px', color: '#ccccaa', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.container.add(title);

    // Grid 4x3
    const cols = 4, rows = 3;
    const cellSize = 50, gridX = px + 60, gridY = py + 50;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const cx = gridX + c * (cellSize + 8);
        const cy = gridY + r * (cellSize + 8);

        const cell = this.scene.add.graphics();
        cell.fillStyle(0x222233, 0.8);
        cell.fillRoundedRect(cx, cy, cellSize, cellSize, 4);
        cell.lineStyle(1, 0x555555);
        cell.strokeRoundedRect(cx, cy, cellSize, cellSize, 4);
        this.container.add(cell);

        if (idx < pouch.fragments.length) {
          const frag = pouch.fragments[idx];
          const label = this.scene.add.text(cx + cellSize / 2, cy + cellSize / 2, TIER_LABELS[frag.tier], {
            fontSize: '20px', color: TIER_COLORS[frag.tier], fontFamily: 'serif',
          }).setOrigin(0.5);
          this.container.add(label);
          this.slotTexts.push(label);
        }
      }
    }

    // Count by tier
    const rawCount = pouch.fragments.filter(f => f.tier === FragmentTier.RAW).length;
    const mergedCount = pouch.fragments.filter(f => f.tier === FragmentTier.MERGED).length;
    const superCount = pouch.fragments.filter(f => f.tier === FragmentTier.SUPER_MERGED).length;

    const countText = this.scene.add.text(px + panelW / 2, py + 250,
      `★ ${rawCount}  ✦ ${mergedCount}  ✧ ${superCount}`, {
      fontSize: '12px', color: '#aaaaaa', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.container.add(countText);

    // Action buttons with keyboard shortcuts
    const buttonY = py + 280;
    const buttonDefs: { key: string; label: string; enabled: boolean; action: () => void }[] = [
      {
        key: '[1]',
        label: `합치기 (★×${MERGE_COUNT}→✦)`,
        enabled: rawCount >= MERGE_COUNT,
        action: () => this.mergeRaw(),
      },
      {
        key: '[2]',
        label: `별막대기 제작 (★×${STICK_CRAFT_COUNT})`,
        enabled: rawCount >= STICK_CRAFT_COUNT,
        action: () => this.craftStick(),
      },
      {
        key: '[3]',
        label: `조각→XP (★×1 = 10XP)`,
        enabled: rawCount >= 1,
        action: () => this.useFragmentsAsXP(),
      },
      {
        key: '[4]',
        label: `조각→HP (★×1 = +10HP)`,
        enabled: rawCount >= 1,
        action: () => this.useFragmentsAsHP(),
      },
    ];

    buttonDefs.forEach((btn, i) => {
      const by = buttonY + i * 28;
      const color = btn.enabled ? '#ffcc44' : '#555544';
      const text = this.scene.add.text(px + 40, by, `${btn.key} ${btn.label}`, {
        fontSize: '12px', color, fontFamily: 'monospace',
        backgroundColor: btn.enabled ? '#333344' : '#1a1a22',
        padding: { x: 8, y: 4 },
      });

      if (btn.enabled) {
        // Explicit hitArea for reliable click detection
        text.setInteractive(new Phaser.Geom.Rectangle(0, 0, text.width, text.height), Phaser.Geom.Rectangle.Contains);
        text.on('pointerdown', btn.action);
        text.on('pointerover', () => text.setColor('#ffffff'));
        text.on('pointerout', () => text.setColor('#ffcc44'));
      }
      this.container.add(text);
    });

    // Star sticks display
    if (this.inventory.starSticks.length > 0) {
      const stickTitle = this.scene.add.text(px + panelW / 2, py + 400, '별 막대기:', {
        fontSize: '11px', color: '#aaaa88', fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.container.add(stickTitle);

      this.inventory.starSticks.forEach((stick, i) => {
        const stickText = this.scene.add.text(px + 60 + i * 100, py + 420,
          `⚔ ${stick.tier} (${stick.durability}/${stick.maxDurability})`, {
          fontSize: '10px', color: '#ccaa44', fontFamily: 'monospace',
        });
        this.container.add(stickText);
      });
    }

    // Close hint
    const closeHint = this.scene.add.text(px + panelW / 2, py + panelH - 20, '[E] 닫기   [1~4] 단축키', {
      fontSize: '10px', color: '#666655', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.container.add(closeHint);
  }

  private mergeRaw(): void {
    const pouch = getActivePouch(this.inventory);
    const rawFragments = pouch.fragments.filter(f => f.tier === FragmentTier.RAW);
    if (rawFragments.length < MERGE_COUNT) return;

    const toMerge = rawFragments.slice(0, MERGE_COUNT);
    const result = MergeSystem.mergeFragments(toMerge);
    if (!result) return;

    // Remove merged fragments
    for (const frag of toMerge) {
      const idx = pouch.fragments.indexOf(frag);
      if (idx !== -1) pouch.fragments.splice(idx, 1);
    }
    pouch.fragments.push(result);
    eventBus.emit('fragment:merged', { result });
    this.refresh();
  }

  private mergeMerged(): void {
    const pouch = getActivePouch(this.inventory);
    const merged = pouch.fragments.filter(f => f.tier === FragmentTier.MERGED);
    if (merged.length < MERGE_COUNT) return;

    const toMerge = merged.slice(0, MERGE_COUNT);
    const result = MergeSystem.mergeFragments(toMerge);
    if (!result) return;

    for (const frag of toMerge) {
      const idx = pouch.fragments.indexOf(frag);
      if (idx !== -1) pouch.fragments.splice(idx, 1);
    }
    pouch.fragments.push(result);
    eventBus.emit('fragment:merged', { result });
    this.refresh();
  }

  private craftStick(): void {
    const pouch = getActivePouch(this.inventory);
    const rawFragments = pouch.fragments.filter(f => f.tier === FragmentTier.RAW);
    if (rawFragments.length < STICK_CRAFT_COUNT) return;

    const toUse = rawFragments.slice(0, STICK_CRAFT_COUNT);
    const stick = MergeSystem.craftStarStick(toUse);
    if (!stick) return;

    for (const frag of toUse) {
      const idx = pouch.fragments.indexOf(frag);
      if (idx !== -1) pouch.fragments.splice(idx, 1);
    }
    this.inventory.starSticks.push(stick);
    this.lastActionMessage = '별 막대기 제작 완료!';
    this.refresh();
  }

  private useFragmentsAsXP(): void {
    if (!this.playerState) return;
    const pouch = getActivePouch(this.inventory);
    const raw = pouch.fragments.find(f => f.tier === FragmentTier.RAW);
    if (!raw) return;

    const idx = pouch.fragments.indexOf(raw);
    if (idx !== -1) pouch.fragments.splice(idx, 1);

    const xp = MergeSystem.getXpValue(raw);
    const newLight = ProgressionSystem.addXp(this.playerState, xp);
    this.lastActionMessage = newLight
      ? `+${xp}XP! 레벨 업! ${newLight}로 업그레이드`
      : `+${xp}XP`;
    this.refresh();
  }

  private useFragmentsAsHP(): void {
    if (!this.playerState) return;
    const pouch = getActivePouch(this.inventory);
    const raw = pouch.fragments.find(f => f.tier === FragmentTier.RAW);
    if (!raw) return;

    const idx = pouch.fragments.indexOf(raw);
    if (idx !== -1) pouch.fragments.splice(idx, 1);

    CombatSystem.healPlayer(this.playerState, 10);
    this.lastActionMessage = '+10 HP 회복';
    this.refresh();
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
