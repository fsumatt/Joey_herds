import Phaser from 'phaser';
import { createPlaceholders } from './art/createPlaceholders';
import { playPlaceholderSound } from './audio/sfx';
import { Player } from './entities/Player';
import { Sheep } from './entities/Sheep';
import { getLevel, type LevelConfig } from './levels';

type GameData = { levelId?: number };

export class GameScene extends Phaser.Scene {
  private level!: LevelConfig;
  private joey!: Player;
  private sheep: Sheep[] = [];
  private timerText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private remaining = 0;
  private ended = false;

  constructor() { super('GameScene'); }

  init(data: GameData) { this.level = getLevel(data.levelId ?? 1); this.remaining = this.level.seconds; this.ended = false; this.sheep = []; }

  create() {
    createPlaceholders(this);
    this.drawPasture();
    this.drawCorral();
    this.level.obstacles.forEach((rock) => this.add.image(rock.x, rock.y, 'rock').setDisplaySize(rock.radius * 2, rock.radius * 2));
    this.sheep = this.level.sheep.map((point) => new Sheep(this, point));
    this.joey = new Player(this, this.level.joeyStart);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.y < 80) return;
      this.joey.moveTo({ x: p.x, y: p.y });
      playPlaceholderSound('bark');
    });
    this.add.rectangle(640, 36, 760, 56, 0xfff7e8, 0.94).setStrokeStyle(4, 0x6f5434).setDepth(90);
    this.add.text(325, 20, `LEVEL ${this.level.id}  ${this.level.name}`, { fontSize: '22px', color: '#4b3825', fontStyle: 'bold' }).setDepth(91);
    this.scoreText = this.add.text(565, 20, '', { fontSize: '24px', color: '#2d5d2f', fontStyle: 'bold' }).setDepth(91);
    this.timerText = this.add.text(735, 20, '', { fontSize: '24px', color: '#a64b2a', fontStyle: 'bold' }).setDepth(91);
    this.add.text(930, 18, 'PAUSE', { fontSize: '20px', color: '#4b3825', backgroundColor: '#ead6b0', padding: { x: 14, y: 8 } }).setDepth(92).setInteractive().on('pointerdown', () => this.scene.launch('PauseScene'));
    this.add.text(390, 66, 'Tap or click the pasture to move Joey • WASD/arrow keys are optional', { fontSize: '18px', color: '#4b3825', fontStyle: 'bold' }).setDepth(91);
  }

  update(_time: number, delta: number) {
    if (this.scene.isPaused() || this.ended) return;
    this.remaining -= delta / 1000;
    this.joey.update(delta);
    this.sheep.forEach((s) => {
      if (s.updateSheep(delta, this.joey, this.level.obstacles, this.level.corral)) playPlaceholderSound('capture');
    });
    const captured = this.sheep.filter((s) => s.captured).length;
    this.scoreText.setText(`SHEEP ${captured}/${this.sheep.length}`);
    this.timerText.setText(`TIME ${Math.max(0, Math.ceil(this.remaining))}`);
    if (captured === this.sheep.length) this.finish(true);
    else if (this.remaining <= 0) this.finish(false);
  }

  private finish(won: boolean) {
    this.ended = true;
    if (won) playPlaceholderSound('complete');
    this.time.delayedCall(500, () => this.scene.start('ResultScene', { won, levelId: this.level.id, captured: this.sheep.filter((s) => s.captured).length, total: this.sheep.length }));
  }

  private drawPasture() {
    this.add.rectangle(640, 360, 1280, 720, 0x91bd61);
    for (let i = 0; i < 180; i++) this.add.circle(Phaser.Math.Between(10, 1270), Phaser.Math.Between(80, 710), Phaser.Math.Between(1, 3), Phaser.Math.RND.pick([0xb9d17a, 0xf5df88, 0xe6f2ca]), 0.55);
  }

  private drawCorral() {
    const c = this.level.corral;
    this.add.rectangle(c.x + c.width / 2, c.y + c.height / 2, c.width, c.height, 0xcbbf82, 0.35).setStrokeStyle(5, 0x8a5a2b);
    for (let x = c.x; x <= c.x + c.width; x += 34) { this.add.rectangle(x, c.y, 12, 24, 0x9a642e); this.add.rectangle(x, c.y + c.height, 12, 24, 0x9a642e); }
    for (let y = c.y; y <= c.y + c.height; y += 34) { this.add.rectangle(c.x, y, 24, 12, 0x9a642e); this.add.rectangle(c.x + c.width, y, 24, 12, 0x9a642e); }
    this.add.text(c.x + c.width - 64, c.y - 38, '⚑ CORRAL', { fontSize: '20px', color: '#70451f', fontStyle: 'bold' });
  }
}
