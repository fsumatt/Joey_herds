import Phaser from 'phaser';
import { levels } from '../levels';

export class LevelSelectScene extends Phaser.Scene {
  constructor() { super('LevelSelectScene'); }
  create() {
    this.add.rectangle(640, 360, 1280, 720, 0xa8cb78);
    this.add.text(640, 100, 'Choose a Meadow', { fontSize: '54px', color: '#fff8e8', fontStyle: 'bold', stroke: '#60401f', strokeThickness: 6 }).setOrigin(0.5);
    levels.forEach((level, i) => {
      const x = 260 + (i % 3) * 380; const y = 245 + Math.floor(i / 3) * 165;
      this.add.rectangle(x, y, 300, 110, 0xfff1cf, 0.95).setStrokeStyle(4, 0x7b5631).setInteractive().on('pointerdown', () => this.scene.start('GameScene', { levelId: level.id }));
      this.add.text(x, y - 20, `Level ${level.id}`, { fontSize: '30px', color: '#4b321f', fontStyle: 'bold' }).setOrigin(0.5);
      this.add.text(x, y + 20, `${level.name} • ${level.sheep.length} sheep`, { fontSize: '18px', color: '#4b321f' }).setOrigin(0.5);
    });
  }
}
