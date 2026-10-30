'use client';

import { useEffect, useRef, useState } from 'react';
import { Game } from './scene';
import { MountGuard } from './mountGuard';

// Owns the Pixi application lifecycle: create on mount, destroy on unmount.
// Keyboard + touch input are aggregated here and pushed into the game.
export default function GameCanvas({ onReady }: { onReady: (game: Game | null) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const guardRef = useRef<MountGuard | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (!guardRef.current) guardRef.current = new MountGuard();
    const guard = guardRef.current;
    const token = guard.next();
    let game: Game | null = null;

    Game.create(host)
      .then((g) => {
        if (!guard.isCurrent(token)) {
          // Stale StrictMode boot: destroy the orphan without touching the
          // live canvas (Game.destroy only removes its own canvas).
          g.destroy();
          return;
        }
        game = g;
        gameRef.current = g;
        setBootError(null);
        readyRef.current(g);
      })
      .catch((err: unknown) => {
        if (!guard.isCurrent(token)) return;
        const message = err instanceof Error ? err.message : String(err);
        console.error('[game] Pixi boot failed:', err);
        setBootError(message || 'unknown boot failure');
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
      guard.next(); // invalidate this mount's pending boot, if any
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
      {bootError && (
        <div
          role="alert"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            textAlign: 'center',
            fontSize: '0.85rem',
            lineHeight: 1.6,
            color: '#7a2e1d',
            backgroundColor: '#f3e2d8',
            borderRadius: '12px',
          }}
        >
          The game canvas failed to start: {bootError}. Please screenshot this and your
          browser console.
        </div>
      )}
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
