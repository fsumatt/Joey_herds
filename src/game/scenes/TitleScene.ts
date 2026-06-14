import Phaser from 'phaser';

export class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene'); }
  create() {
    this.add.rectangle(640, 360, 1280, 720, 0x8fbd62);
    this.add.text(640, 170, 'Joey Herds', { fontSize: '78px', color: '#fff8e8', fontStyle: 'bold', stroke: '#65421f', strokeThickness: 8 }).setOrigin(0.5);
    this.add.text(640, 258, 'Help Joey the corgi guide every fluffy sheep into the cozy corral.', { fontSize: '26px', color: '#3e321f' }).setOrigin(0.5);
    this.add.text(640, 380, 'TAP TO START', { fontSize: '34px', color: '#4b321f', backgroundColor: '#fff4d7', padding: { x: 28, y: 16 } }).setOrigin(0.5).setInteractive().on('pointerdown', () => this.scene.start('LevelSelectScene'));
    this.add.text(640, 525, 'Controls: WASD or arrow keys to move Joey. Click/tap also works.', { fontSize: '22px', color: '#4b321f' }).setOrigin(0.5);
  }
}
