import Phaser from 'phaser';

export class PauseScene extends Phaser.Scene {
  constructor() { super('PauseScene'); }
  create() {
    this.scene.pause('GameScene');
    this.add.rectangle(640, 360, 1280, 720, 0x2b2419, 0.55);
    this.add.rectangle(640, 360, 420, 300, 0xfff3d4).setStrokeStyle(5, 0x704c2b);
    this.add.text(640, 280, 'Paused', { fontSize: '48px', color: '#4b321f', fontStyle: 'bold' }).setOrigin(0.5);
    this.button(640, 360, 'Resume', () => { this.scene.stop(); this.scene.resume('GameScene'); });
    this.button(640, 440, 'Level Select', () => { this.scene.stop('GameScene'); this.scene.start('LevelSelectScene'); });
  }
  private button(x: number, y: number, label: string, cb: () => void) { this.add.text(x, y, label, { fontSize: '28px', color: '#4b321f', backgroundColor: '#ead2a2', padding: { x: 18, y: 10 } }).setOrigin(0.5).setInteractive().on('pointerdown', cb); }
}
