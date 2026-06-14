import Phaser from 'phaser';
import type { CorralConfig, ObstacleConfig, Point } from '../levels';

export class Sheep extends Phaser.GameObjects.Sprite {
  captured = false;
  private velocity = new Phaser.Math.Vector2();
  private wander = new Phaser.Math.Vector2(1, 0).rotate(Math.random() * Math.PI * 2);
  private nextWander = 0;

  constructor(scene: Phaser.Scene, start: Point) {
    super(scene, start.x, start.y, 'sheep');
    scene.add.existing(this);
    this.setScale(0.72).setDepth(15);
  }

  updateSheep(delta: number, joey: Point, obstacles: ObstacleConfig[], corral: CorralConfig) {
    if (this.captured) return false;
    const dt = delta / 1000;
    const steer = new Phaser.Math.Vector2();
    const away = new Phaser.Math.Vector2(this.x - joey.x, this.y - joey.y);
    const distanceToJoey = away.length();
    const corralCenter = new Phaser.Math.Vector2(corral.x + corral.width / 2, corral.y + corral.height / 2);
    const toCorral = corralCenter.clone().subtract(new Phaser.Math.Vector2(this.x, this.y));
    const distanceToCorral = toCorral.length();

    // Sheep now behave more like a controllable flock than purely random critters.
    // Joey's pressure still moves them away from him, but sheep also bias toward the
    // corral when that pressure is coming from the useful "behind the flock" side.
    if (distanceToJoey < 215) {
      const pressure = 1 - distanceToJoey / 215;
      const awayFromJoey = away.normalize();
      const corralDirection = toCorral.lengthSq() > 0 ? toCorral.normalize() : new Phaser.Math.Vector2();
      const usefulPush = Phaser.Math.Clamp(awayFromJoey.dot(corralDirection), 0, 1);

      steer.add(awayFromJoey.scale(170 * pressure));
      steer.add(corralDirection.scale((95 + 165 * usefulPush) * pressure));
    }
    else {
      this.nextWander -= delta;
      if (this.nextWander <= 0) { this.wander.setTo(1, 0).rotate(Math.random() * Math.PI * 2); this.nextWander = Phaser.Math.Between(1200, 2600); }
      steer.add(this.wander.clone().scale(18));
      if (distanceToCorral < 360 && toCorral.lengthSq() > 0) steer.add(toCorral.normalize().scale(16));
    }

    obstacles.forEach((rock) => {
      const avoid = new Phaser.Math.Vector2(this.x - rock.x, this.y - rock.y);
      const d = avoid.length();
      if (d < rock.radius + 44) steer.add(avoid.normalize().scale(190 * (1 - d / (rock.radius + 44))));
    });

    if (this.x < 35) steer.x += 110; if (this.x > 1245) steer.x -= 110;
    if (this.y < 90) steer.y += 110; if (this.y > 685) steer.y -= 110;

    this.velocity.lerp(steer, 0.045).limit(145);
    this.x += this.velocity.x * dt;
    this.y += this.velocity.y * dt;
    if (this.velocity.lengthSq() > 4) this.rotation = this.velocity.angle() + Math.PI / 2;
    if (Phaser.Geom.Rectangle.Contains(new Phaser.Geom.Rectangle(corral.x, corral.y, corral.width, corral.height), this.x, this.y)) {
      this.capture();
      return true;
    }
    return false;
  }

  private capture() {
    this.captured = true;
    this.setAlpha(0.45).setScale(0.58).setTint(0xdff5d2);
  }
}
