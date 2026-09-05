import { useEffect, useRef } from 'react';
import { MeadowGame } from '../game3d/MeadowGame';
export function ThreeGame() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return;
    const game = new MeadowGame(host.current);
    return () => game.dispose();
  }, []);
  return <div className="game-wrap" ref={host} aria-label="Joey Herds 3D game" />;
}
