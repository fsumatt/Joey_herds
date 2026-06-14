import Phaser from 'phaser';
import { createPlaceholders } from '../art/createPlaceholders';

export class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene'); }
  create() {
    createPlaceholders(this);
    this.add.rectangle(640, 360, 1280, 720, 0x8fbd62);
    for (let i = 0; i < 34; i++) this.add.circle(Phaser.Math.Between(20, 1260), Phaser.Math.Between(40, 700), Phaser.Math.Between(2, 5), Phaser.Math.RND.pick([0xfff1a8, 0xd8ef9f, 0xffffff]), 0.35);
    this.add.image(430, 420, 'joey').setScale(1.8).setAngle(-8);
    this.add.image(820, 420, 'sheep').setScale(1.4).setAngle(8);
    this.add.image(905, 462, 'sheep').setScale(1.15).setAngle(-12);
    this.add.text(640, 170, 'Joey Herds', { fontSize: '78px', color: '#fff8e8', fontStyle: 'bold', stroke: '#65421f', strokeThickness: 8 }).setOrigin(0.5);
    this.add.text(640, 258, 'Help Joey the corgi guide every fluffy sheep into the cozy corral.', { fontSize: '26px', color: '#3e321f' }).setOrigin(0.5);
    this.add.text(640, 548, 'TAP TO START', { fontSize: '34px', color: '#4b321f', backgroundColor: '#fff4d7', padding: { x: 28, y: 16 } }).setOrigin(0.5).setInteractive().on('pointerdown', () => this.scene.start('LevelSelectScene'));
    this.add.text(640, 625, 'Tap or click the pasture to move Joey. WASD/arrow keys are optional on desktop.', { fontSize: '22px', color: '#4b321f' }).setOrigin(0.5);
  }
}
