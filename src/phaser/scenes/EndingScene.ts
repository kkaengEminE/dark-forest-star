import Phaser from 'phaser';
import { DifficultyLevel } from '../../core/models/Difficulty';

export class EndingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EndingScene' });
  }

  create(data: { difficulty?: DifficultyLevel }): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#050a18');

    // Star rising animation
    const star = this.add.text(width / 2, height * 0.8, '★', {
      fontSize: '48px',
      color: '#ffffaa',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: star,
      y: height * 0.2,
      alpha: { from: 1, to: 0.6 },
      duration: 4000,
      ease: 'Sine.easeInOut',
    });

    // Tree silhouette
    this.add.text(width / 2, height * 0.65, '🌲', {
      fontSize: '64px',
    }).setOrigin(0.5).setAlpha(0.3);

    // Mountain
    const mountain = this.add.graphics();
    mountain.fillStyle(0x1a1a2a, 0.8);
    mountain.fillTriangle(width * 0.3, height * 0.7, width * 0.5, height * 0.4, width * 0.7, height * 0.7);
    mountain.setDepth(0);

    // Ending text (delayed)
    this.time.delayedCall(3000, () => {
      this.add.text(width / 2, height * 0.15, '별이 되었습니다', {
        fontSize: '28px',
        color: '#ffffcc',
        fontFamily: 'serif',
      }).setOrigin(0.5).setAlpha(0).setDepth(10);
    });

    this.time.delayedCall(4500, () => {
      const endText = this.add.text(width / 2, height * 0.15, '별이 되었습니다', {
        fontSize: '28px',
        color: '#ffffcc',
        fontFamily: 'serif',
      }).setOrigin(0.5).setDepth(10);

      this.tweens.add({
        targets: endText,
        alpha: { from: 0, to: 1 },
        duration: 2000,
      });
    });

    this.time.delayedCall(6000, () => {
      this.add.text(width / 2, height * 0.28, '어둠의 숲에 빛이 되어 남았습니다', {
        fontSize: '13px',
        color: '#888877',
        fontFamily: 'monospace',
        fontStyle: 'italic',
      }).setOrigin(0.5);
    });

    // Continue option
    this.time.delayedCall(8000, () => {
      const ngPlus = this.add.text(width / 2, height * 0.85, '[ENTER] 2회차 시작  [ESC] 타이틀', {
        fontSize: '12px',
        color: '#666655',
        fontFamily: 'monospace',
      }).setOrigin(0.5);

      this.tweens.add({
        targets: ngPlus,
        alpha: { from: 0, to: 1 },
        duration: 1500,
      });

      this.input.keyboard!.on('keydown-ENTER', () => {
        // New Game+ - harder difficulty
        const currentDiff = data.difficulty ?? DifficultyLevel.STAR_5;
        const nextDiffs: Record<number, DifficultyLevel> = {
          [DifficultyLevel.STAR_3]: DifficultyLevel.STAR_4,
          [DifficultyLevel.STAR_4]: DifficultyLevel.STAR_5,
          [DifficultyLevel.STAR_5]: DifficultyLevel.STAR_6,
          [DifficultyLevel.STAR_6]: DifficultyLevel.STAR_8,
          [DifficultyLevel.STAR_8]: DifficultyLevel.STAR_12,
          [DifficultyLevel.STAR_12]: DifficultyLevel.STAR_12,
        };
        this.scene.start('GameScene', { difficulty: nextDiffs[currentDiff] });
      });

      this.input.keyboard!.on('keydown-ESC', () => {
        this.scene.start('TitleScene');
      });
    });
  }
}
