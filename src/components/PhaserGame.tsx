import { useEffect, useRef, useState } from 'react';
import type PhaserType from 'phaser';

export function PhaserGame() {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<PhaserType.Game | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootGame() {
      if (!hostRef.current || gameRef.current) return;

      try {
        const [{ default: Phaser }, { scenes }] = await Promise.all([
          import('phaser'),
          import('../game/scenes'),
        ]);

        if (cancelled || !hostRef.current) return;

        gameRef.current = new Phaser.Game({
          type: Phaser.AUTO,
          parent: hostRef.current,
          width: 1280,
          height: 720,
          backgroundColor: '#88b95f',
          scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
          scene: scenes,
        });
      } catch (error) {
        console.error('Unable to start Joey Herds', error);
        setLoadError(error instanceof Error ? error.message : 'Unknown Phaser boot error');
      }
    }

    void bootGame();

    return () => {
      cancelled = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div className="game-wrap" ref={hostRef} aria-label="Joey Herds game">
      {loadError ? (
        <div className="game-error">
          <strong>Joey Herds could not start.</strong>
          <span>{loadError}</span>
        </div>
      ) : null}
    </div>
  );
}
