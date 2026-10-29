'use client';

import { useEffect, useRef } from 'react';
import { Game } from './scene';

// Owns the Pixi application lifecycle: create on mount, destroy on unmount.
// Keyboard + touch input are aggregated here and pushed into the game.
export default function GameCanvas({ onReady }: { onReady: (game: Game | null) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let game: Game | null = null;

    Game.create(host)
      .then((g) => {
        if (cancelled) {
          g.destroy();
          return;
        }
        game = g;
        gameRef.current = g;
        readyRef.current(g);
      })
      .catch(() => {
        // Boot failure surfaces as an empty stage; the page shows guidance.
      });

    const keys = new Set<string>();
    const push = () => {
      gameRef.current?.setInput({
        left: keys.has('ArrowLeft') || keys.has('a') || keys.has('A'),
        right: keys.has('ArrowRight') || keys.has('d') || keys.has('D'),
        jumpHeld: keys.has(' ') || keys.has('ArrowUp') || keys.has('w') || keys.has('W'),
      });
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', ' '].includes(e.key)) e.preventDefault();
      if (!e.repeat && (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W')) {
        gameRef.current?.setInput({ jumpPressed: true });
      }
      keys.add(e.key);
      push();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.key);
      push();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      cancelled = true;
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      game?.destroy();
      gameRef.current = null;
      readyRef.current(null);
    };
  }, []);

  const hold = (patch: Parameters<Game['setInput']>[0]) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      gameRef.current?.setInput(patch);
    },
    onPointerUp: () => gameRef.current?.setInput({ left: false, right: false }),
    onPointerCancel: () => gameRef.current?.setInput({ left: false, right: false }),
  });

  const touchBtn: React.CSSProperties = {
    width: '56px',
    height: '56px',
    fontSize: '1.4rem',
    borderRadius: '14px',
    border: '1px solid rgba(244,239,228,0.35)',
    backgroundColor: 'rgba(16,21,17,0.55)',
    color: '#f4efe4',
    cursor: 'pointer',
    touchAction: 'none',
    userSelect: 'none',
  };

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={hostRef}
        style={{
          width: '100%',
          height: 'clamp(320px, 58vh, 560px)',
          borderRadius: '12px',
          overflow: 'hidden',
          backgroundColor: '#d8d5cc',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '12px',
          right: '12px',
          bottom: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', gap: '10px', pointerEvents: 'auto' }}>
          <button aria-label="Move left" style={touchBtn} {...hold({ left: true })}>
            ◀
          </button>
          <button aria-label="Move right" style={touchBtn} {...hold({ right: true })}>
            ▶
          </button>
        </div>
        <div style={{ pointerEvents: 'auto' }}>
          <button
            aria-label="Jump"
            style={touchBtn}
            onPointerDown={(e) => {
              e.preventDefault();
              gameRef.current?.setInput({ jumpPressed: true, jumpHeld: true });
            }}
            onPointerUp={() => gameRef.current?.setInput({ jumpHeld: false })}
          >
            ⤒
          </button>
        </div>
      </div>
    </div>
  );
}
