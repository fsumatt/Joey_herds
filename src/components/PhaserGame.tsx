import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { scenes } from '../game/scenes';

export function PhaserGame() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: hostRef.current,
      width: 1280,
      height: 720,
      backgroundColor: '#88b95f',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      input: { activePointers: 3 },
      scene: scenes,
    });
    return () => game.destroy(true);
  }, []);

  return <div className="game-wrap" ref={hostRef} aria-label="Joey Herds game" />;
}
