import Phaser from 'phaser';
import { DifficultyLevel } from '../../core/models/Difficulty';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: { difficulty?: DifficultyLevel; reason?: string }): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#020408');

    const isHammer = data.reason === 'hammer';

    // Death message
    this.add.text(width / 2, height * 0.3, isHammer ? '망치동물이 되었습니다' : '불이 꺼졌습니다', {
      fontSize: '32px',
      color: isHammer ? '#ff4444' : '#666655',
      fontFamily: 'serif',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.42,
      isHammer
        ? '너무 많은 공격으로 어둠의 존재가 되었습니다...'
        : '어둠이 당신을 삼켰습니다...', {
      fontSize: '13px',
      color: '#555544',
      fontFamily: 'monospace',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    // Retry button
    const retryBtn = this.add.text(width / 2, height * 0.6, '다시 도전', {
      fontSize: '16px',
      color: '#aaaa88',
      fontFamily: 'monospace',
      backgroundColor: '#222233',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive();

    retryBtn.on('pointerover', () => retryBtn.setColor('#ffffaa'));
    retryBtn.on('pointerout', () => retryBtn.setColor('#aaaa88'));
    retryBtn.on('pointerdown', () => {
      this.scene.start('GameScene', { difficulty: data.difficulty ?? DifficultyLevel.STAR_5 });
    });

    // Title button
    const titleBtn = this.add.text(width / 2, height * 0.72, '타이틀로', {
      fontSize: '14px',
      color: '#777766',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive();

    titleBtn.on('pointerover', () => titleBtn.setColor('#ffffaa'));
    titleBtn.on('pointerout', () => titleBtn.setColor('#777766'));
    titleBtn.on('pointerdown', () => {
      this.scene.start('TitleScene');
    });

    // Keyboard
    this.input.keyboard!.on('keydown-ENTER', () => {
      this.scene.start('GameScene', { difficulty: data.difficulty ?? DifficultyLevel.STAR_5 });
    });
    this.input.keyboard!.on('keydown-ESC', () => {
      this.scene.start('TitleScene');
    });
  }
}
