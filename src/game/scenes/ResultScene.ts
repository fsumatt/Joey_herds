import Phaser from 'phaser';
import { levels } from '../levels';

type ResultData = { won: boolean; levelId: number; captured: number; total: number };
export class ResultScene extends Phaser.Scene {
  private result!: ResultData;
  constructor() { super('ResultScene'); }
  init(data: ResultData) { this.result = data; }
  create() {
    this.add.rectangle(640, 360, 1280, 720, this.result.won ? 0x9ccc72 : 0x8cab67);
    this.add.text(640, 155, this.result.won ? 'Level Complete!' : 'Time is Up!', { fontSize: '62px', color: '#fff7df', fontStyle: 'bold', stroke: '#60401f', strokeThickness: 7 }).setOrigin(0.5);
    this.add.text(640, 245, this.result.won ? 'Every sheep is cozy in the corral!' : 'Joey can try this meadow again.', { fontSize: '30px', color: '#3f301f', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(640, 310, `Sheep herded: ${this.result.captured}/${this.result.total}`, { fontSize: '30px', color: '#3f301f' }).setOrigin(0.5);
    if (this.result.won) this.add.text(640, 380, '★  ★  ★', { fontSize: '50px', color: '#ffe072', stroke: '#7d5622', strokeThickness: 5 }).setOrigin(0.5);
    this.button(640, this.result.won ? 470 : 400, 'Retry', () => this.scene.start('GameScene', { levelId: this.result.levelId }));
    const next = Math.min(this.result.levelId + 1, levels.length);
    this.button(640, this.result.won ? 550 : 480, this.result.won && next !== this.result.levelId ? 'Next Level' : 'Level Select', () => this.result.won && next !== this.result.levelId ? this.scene.start('GameScene', { levelId: next }) : this.scene.start('LevelSelectScene'));
  }
  private button(x: number, y: number, label: string, cb: () => void) { this.add.text(x, y, label, { fontSize: '28px', color: '#4b321f', backgroundColor: '#fff0c9', padding: { x: 24, y: 12 } }).setOrigin(0.5).setInteractive().on('pointerdown', cb); }
}
