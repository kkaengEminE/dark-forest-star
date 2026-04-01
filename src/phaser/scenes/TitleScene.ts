import Phaser from 'phaser';
import { DifficultyLevel } from '../../core/models/Difficulty';

interface DifficultyOption {
  level: DifficultyLevel;
  label: string;
  moonLabel: string;
}

const DIFFICULTIES: DifficultyOption[] = [
  { level: DifficultyLevel.STAR_3,  label: '△ 3각별', moonLabel: '보름달 - 쉬움' },
  { level: DifficultyLevel.STAR_4,  label: '◇ 4각별', moonLabel: '상현달' },
  { level: DifficultyLevel.STAR_5,  label: '⬠ 5각별', moonLabel: '반달 - 보통' },
  { level: DifficultyLevel.STAR_6,  label: '⬡ 6각별', moonLabel: '하현달' },
  { level: DifficultyLevel.STAR_8,  label: '✦ 8각별', moonLabel: '그믐달 - 어려움' },
  { level: DifficultyLevel.STAR_12, label: '✧ 12각별', moonLabel: '삭 - 악몽' },
];

export class TitleScene extends Phaser.Scene {
  private selectedIndex = 0;
  private difficultyTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    // Dark background with faint moon
    this.cameras.main.setBackgroundColor('#050a14');

    // Moon glow in corner
    const moon = this.add.image(width - 80, 60, 'moon-glow').setAlpha(0.5).setScale(1.5);
    this.tweens.add({
      targets: moon,
      alpha: 0.3,
      duration: 3000,
      yoyo: true,
      repeat: -1,
    });

    // Title
    this.add.text(width / 2, height * 0.15, '별, 어둠의 숲', {
      fontSize: '48px',
      color: '#ccccaa',
      fontFamily: 'serif',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.25, 'DARK FOREST STAR', {
      fontSize: '18px',
      color: '#888877',
      fontFamily: 'monospace',
      letterSpacing: 8,
    }).setOrigin(0.5);

    // Tagline
    this.add.text(width / 2, height * 0.33, '"우주는 어둠의 숲이다..."', {
      fontSize: '13px',
      color: '#666655',
      fontFamily: 'serif',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    // Difficulty selection header
    this.add.text(width / 2, height * 0.43, '난이도 선택', {
      fontSize: '16px',
      color: '#aaaa88',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Difficulty options
    this.difficultyTexts = DIFFICULTIES.map((diff, i) => {
      const y = height * 0.52 + i * 36;
      const text = this.add.text(width / 2, y, `${diff.label}  ${diff.moonLabel}`, {
        fontSize: '14px',
        color: '#777766',
        fontFamily: 'monospace',
      }).setOrigin(0.5).setInteractive();

      text.on('pointerover', () => {
        this.selectedIndex = i;
        this.updateSelection();
      });
      text.on('pointerdown', () => {
        this.startGame(diff.level);
      });

      return text;
    });

    // Enter hint
    this.add.text(width / 2, height * 0.92, '[↑↓] 선택   [ENTER] 시작   [WASD] 이동   [Q] 망토', {
      fontSize: '11px',
      color: '#555544',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Keyboard input
    this.input.keyboard!.on('keydown-UP', () => {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      this.updateSelection();
    });
    this.input.keyboard!.on('keydown-DOWN', () => {
      this.selectedIndex = Math.min(DIFFICULTIES.length - 1, this.selectedIndex + 1);
      this.updateSelection();
    });
    this.input.keyboard!.on('keydown-ENTER', () => {
      this.startGame(DIFFICULTIES[this.selectedIndex].level);
    });

    this.updateSelection();
  }

  private updateSelection(): void {
    this.difficultyTexts.forEach((text, i) => {
      if (i === this.selectedIndex) {
        text.setColor('#ffffaa');
        text.setFontSize(15);
      } else {
        text.setColor('#777766');
        text.setFontSize(14);
      }
    });
  }

  private startGame(difficulty: DifficultyLevel): void {
    this.scene.start('GameScene', { difficulty });
  }
}
