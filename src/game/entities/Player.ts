import Phaser from 'phaser';
import type { Point } from '../levels';

const FIELD_BOUNDS = { minX: 30, maxX: 1250, minY: 88, maxY: 690 };

export class Player extends Phaser.GameObjects.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private moveVector = new Phaser.Math.Vector2();
  private pointerTarget?: Point;
  private destinationMarker: Phaser.GameObjects.Arc;
  speed = 260;

  constructor(scene: Phaser.Scene, start: Point) {
    super(scene, start.x, start.y, 'joey');
    scene.add.existing(this);
    this.setScale(0.9).setDepth(20);
    this.destinationMarker = scene.add
      .circle(start.x, start.y, 12, 0xf7d25c, 0.65)
      .setStrokeStyle(3, 0x8b5b20, 0.9)
      .setDepth(15)
      .setVisible(false);

    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.keys = scene.input.keyboard!.addKeys('W,A,S,D') as Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  }

  moveTo(point: Point) {
    const target = {
      x: Phaser.Math.Clamp(point.x, FIELD_BOUNDS.minX, FIELD_BOUNDS.maxX),
      y: Phaser.Math.Clamp(point.y, FIELD_BOUNDS.minY, FIELD_BOUNDS.maxY),
    };
    this.pointerTarget = target;
    this.destinationMarker.setPosition(target.x, target.y).setVisible(true);
    this.scene.tweens.killTweensOf(this.destinationMarker);
    this.destinationMarker.setScale(0.65).setAlpha(0.9);
    this.scene.tweens.add({
      targets: this.destinationMarker,
      scale: 1.25,
      alpha: 0.45,
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  update(delta: number) {
    const keyboard = this.getKeyboardVector();
    if (keyboard.lengthSq() > 0) {
      this.pointerTarget = undefined;
      this.destinationMarker.setVisible(false);
      this.scene.tweens.killTweensOf(this.destinationMarker);
      this.moveVector.copy(keyboard.normalize());
    } else if (this.pointerTarget) {
      const dx = this.pointerTarget.x - this.x;
      const dy = this.pointerTarget.y - this.y;
      const distance = Math.hypot(dx, dy);
      const step = (this.speed * delta) / 1000;
      if (distance <= Math.max(6, step)) {
        this.x = this.pointerTarget.x;
        this.y = this.pointerTarget.y;
        this.pointerTarget = undefined;
        this.destinationMarker.setVisible(false);
        this.scene.tweens.killTweensOf(this.destinationMarker);
        this.moveVector.set(0, 0);
        return;
      } else {
        this.moveVector.set(dx / distance, dy / distance);
      }
    } else {
      this.moveVector.set(0, 0);
    }

    if (this.moveVector.lengthSq() === 0) return;
    const step = (this.speed * delta) / 1000;
    this.x += this.moveVector.x * step;
    this.y += this.moveVector.y * step;
    this.rotation = this.moveVector.angle() + Math.PI / 2;
    this.x = Phaser.Math.Clamp(this.x, FIELD_BOUNDS.minX, FIELD_BOUNDS.maxX);
    this.y = Phaser.Math.Clamp(this.y, FIELD_BOUNDS.minY, FIELD_BOUNDS.maxY);
  }

  private getKeyboardVector() {
    return new Phaser.Math.Vector2(
      (this.cursors.left?.isDown || this.keys.A.isDown ? -1 : 0) + (this.cursors.right?.isDown || this.keys.D.isDown ? 1 : 0),
      (this.cursors.up?.isDown || this.keys.W.isDown ? -1 : 0) + (this.cursors.down?.isDown || this.keys.S.isDown ? 1 : 0),
    );
  }
}
