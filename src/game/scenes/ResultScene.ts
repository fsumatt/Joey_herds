import Phaser from 'phaser';
import { levels } from '../levels';

type ResultData = { won: boolean; levelId: number; captured: number; total: number };
export class ResultScene extends Phaser.Scene {
  private data!: ResultData;
  constructor() { super('ResultScene'); }
  init(data: ResultData) { this.data = data; }
  create() {
    this.add.rectangle(640, 360, 1280, 720, this.data.won ? 0x9ccc72 : 0x8cab67);
    this.add.text(640, 190, this.data.won ? 'Level Complete!' : 'Time is Up!', { fontSize: '62px', color: '#fff7df', fontStyle: 'bold', stroke: '#60401f', strokeThickness: 7 }).setOrigin(0.5);
    this.add.text(640, 285, `Sheep herded: ${this.data.captured}/${this.data.total}`, { fontSize: '30px', color: '#3f301f' }).setOrigin(0.5);
    this.button(640, 380, 'Retry', () => this.scene.start('GameScene', { levelId: this.data.levelId }));
    const next = Math.min(this.data.levelId + 1, levels.length);
    this.button(640, 460, this.data.won && next !== this.data.levelId ? 'Next Level' : 'Level Select', () => this.data.won && next !== this.data.levelId ? this.scene.start('GameScene', { levelId: next }) : this.scene.start('LevelSelectScene'));
  }
  private button(x: number, y: number, label: string, cb: () => void) { this.add.text(x, y, label, { fontSize: '28px', color: '#4b321f', backgroundColor: '#fff0c9', padding: { x: 24, y: 12 } }).setOrigin(0.5).setInteractive().on('pointerdown', cb); }
}
