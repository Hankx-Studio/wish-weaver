'use client';

import { useEffect, useRef, useState } from 'react';
import { Game } from './scene';
import { MountGuard } from './mountGuard';

// Owns the three.js application lifecycle: create on mount, destroy on unmount.
// Keyboard (WASD/arrows + Space), drag-to-orbit (in scene), and a touch
// joystick + jump button feed screen-space input into the game.
export default function GameCanvas({
  onReady,
  layout = 'card',
}: {
  onReady: (game: Game | null) => void;
  /** 'fill' bleeds to the parent box (fullscreen play); default keeps the card. */
  layout?: 'card' | 'fill';
}) {
  const fill = layout === 'fill';
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const guardRef = useRef<MountGuard | null>(null);
  const joyRef = useRef<HTMLDivElement>(null);
  const joyId = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
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
        console.error('[game] three.js boot failed:', err);
        setBootError(message || 'unknown boot failure');
      });

    const keys = new Set<string>();
    const push = () => {
      const ix =
        (keys.has('d') || keys.has('D') || keys.has('ArrowRight') ? 1 : 0) -
        (keys.has('a') || keys.has('A') || keys.has('ArrowLeft') ? 1 : 0);
      const iz =
        (keys.has('s') || keys.has('S') || keys.has('ArrowDown') ? 1 : 0) -
        (keys.has('w') || keys.has('W') || keys.has('ArrowUp') ? 1 : 0);
      gameRef.current?.setInput({ ix, iz });
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (!e.repeat && e.key === ' ') gameRef.current?.setInput({ jumpPressed: true });
      if (!e.repeat && (e.key === 'h' || e.key === 'H')) gameRef.current?.toggleHero();
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
      guard.next();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      game?.destroy();
      gameRef.current = null;
      readyRef.current(null);
    };
  }, []);

  const setJoystick = (dx: number, dy: number) => {
    const len = Math.hypot(dx, dy);
    const max = 44;
    const k = len > max ? max / len : 1;
    const x = dx * k;
    const y = dy * k;
    setKnob({ x, y });
    gameRef.current?.setInput({ ix: x / max, iz: y / max });
  };

  const jumpBtn: React.CSSProperties = {
    width: '64px',
    height: '64px',
    fontSize: '1.5rem',
    borderRadius: '50%',
    border: '1px solid rgba(244,239,228,0.35)',
    backgroundColor: 'rgba(16,21,17,0.55)',
    color: '#f4efe4',
    cursor: 'pointer',
    touchAction: 'none',
    userSelect: 'none',
  };

  return (
    <div style={fill ? { position: 'absolute', inset: 0 } : { position: 'relative' }}>
      <div
        ref={hostRef}
        style={{
          width: '100%',
          height: fill ? '100%' : 'clamp(340px, 62vh, 600px)',
          borderRadius: fill ? 0 : '12px',
          overflow: 'hidden',
          backgroundColor: '#7fb2e5',
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
            borderRadius: fill ? 0 : '12px',
          }}
        >
          The game canvas failed to start: {bootError}. Please screenshot this and your
          browser console.
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          left: 'max(12px, env(safe-area-inset-left))',
          right: 'max(12px, env(safe-area-inset-right))',
          bottom: fill ? 'calc(96px + env(safe-area-inset-bottom))' : '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          pointerEvents: 'none',
        }}
      >
        <div
          ref={joyRef}
          style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            border: '1px solid rgba(244,239,228,0.35)',
            backgroundColor: 'rgba(16,21,17,0.4)',
            position: 'relative',
            pointerEvents: 'auto',
            touchAction: 'none',
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            joyId.current = e.pointerId;
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            const r = joyRef.current!.getBoundingClientRect();
            setJoystick(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
          }}
          onPointerMove={(e) => {
            if (joyId.current !== e.pointerId) return;
            const r = joyRef.current!.getBoundingClientRect();
            setJoystick(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
          }}
          onPointerUp={() => {
            joyId.current = null;
            setKnob({ x: 0, y: 0 });
            gameRef.current?.setInput({ ix: 0, iz: 0 });
          }}
          onPointerCancel={() => {
            joyId.current = null;
            setKnob({ x: 0, y: 0 });
            gameRef.current?.setInput({ ix: 0, iz: 0 });
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: `calc(50% + ${knob.x}px)`,
              top: `calc(50% + ${knob.y}px)`,
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(244,239,228,0.75)',
              transform: 'translate(-50%, -50%)',
            }}
          />
        </div>
        <div style={{ pointerEvents: 'auto' }}>
          <button
            aria-label="Jump"
            style={jumpBtn}
            onPointerDown={(e) => {
              e.preventDefault();
              gameRef.current?.setInput({ jumpPressed: true });
            }}
          >
            ▲
          </button>
        </div>
      </div>
    </div>
  );
}
