import Phaser from 'phaser';
import type { Point } from '../levels';

export class Joey extends Phaser.Physics.Arcade.Sprite {
  private target: Point;
  speed = 260;

  constructor(scene: Phaser.Scene, start: Point) {
    super(scene, start.x, start.y, 'joey');
    this.target = { ...start };
    scene.add.existing(this);
    this.setScale(0.9).setDepth(20);
  }

  moveTo(point: Point) { this.target = point; }

  update(delta: number) {
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 6) return;
    const step = Math.min(distance, (this.speed * delta) / 1000);
    this.x += (dx / distance) * step;
    this.y += (dy / distance) * step;
    this.rotation = Phaser.Math.Angle.Between(0, 0, dx, dy) + Math.PI / 2;
    this.x = Phaser.Math.Clamp(this.x, 30, 1250);
    this.y = Phaser.Math.Clamp(this.y, 88, 690);
  }
}
