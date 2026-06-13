import Phaser from 'phaser';

export function createPlaceholders(scene: Phaser.Scene) {
  const make = (key: string, draw: (g: Phaser.GameObjects.Graphics) => void, w = 96, h = 96) => {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0 });
    draw(g); g.generateTexture(key, w, h); g.destroy();
  };
  make('joey', (g) => { g.fillStyle(0xd48a2e).fillEllipse(48, 55, 66, 38).fillTriangle(20, 28, 33, 5, 43, 32).fillTriangle(54, 29, 68, 5, 75, 34); g.fillStyle(0xfff4df).fillEllipse(50, 53, 28, 30).fillRect(32, 56, 33, 15); g.fillStyle(0x2c2119).fillCircle(42, 48, 4).fillCircle(58, 48, 4).fillCircle(50, 57, 5); g.fillStyle(0x3f8b54).fillRect(29, 67, 40, 6); });
  make('sheep', (g) => { g.fillStyle(0xffffff).fillCircle(45, 45, 20).fillCircle(30, 46, 14).fillCircle(58, 47, 15).fillCircle(42, 32, 13); g.fillStyle(0x2b2925).fillEllipse(62, 50, 18, 16).fillCircle(67, 48, 2); g.fillRect(34, 61, 5, 12).fillRect(53, 61, 5, 12); }, 84, 84);
  make('rock', (g) => { g.fillStyle(0x8c9188).fillEllipse(48, 52, 70, 48); g.fillStyle(0xb6baaf).fillEllipse(37, 40, 28, 18); g.fillStyle(0x6e736c).fillEllipse(61, 57, 23, 14); });
}
