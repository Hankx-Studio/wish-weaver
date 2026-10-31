'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { FALLBACK_EFFECT, matchLocalPreset, type IntentName } from '@/lib/meta/intent';
import { INTENT_EFFECTS, INTENT_REPLY, type EffectEvent } from '@/lib/effects/types';
import RitualBar from '@/features/world/RitualBar';
import type { Game } from '@/features/world/scene';
import { mountAmbient, playCastChime } from '@/features/world/audio';

// Pixi touches the DOM at boot; keep it out of server rendering entirely.
const GameCanvas = dynamic(() => import('@/features/world/GameCanvas'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100%',
        height: 'clamp(320px, 58vh, 560px)',
        borderRadius: '12px',
        backgroundColor: '#d8d5cc',
      }}
    />
  ),
});

interface CastInfo {
  line: string;
  intent: IntentName;
  source: 'local_rule';
}

// Play screen state: holds the game handle, resolves spells locally, and
// shows the spirit's one-line reply. No network calls in this slice.
export default function PlayClient({ layout = 'card' }: { layout?: 'card' | 'fill' }) {
  const fill = layout === 'fill';
  const gameRef = useRef<Game | null>(null);
  const [cast, setCast] = useState<CastInfo>({
    line: 'The spirit wakes and follows you.',
    intent: 'greet',
    source: 'local_rule',
  });

  // Zero-asset WebAudio ambience: starts on first user gesture, no-op on server.
  useEffect(() => {
    const ambient = mountAmbient();
    return () => ambient.dispose();
  }, []);

  const onReady = useCallback((game: Game | null) => {
    gameRef.current = game;
  }, []);

  const onCast = useCallback((text: string) => {
    const intent: IntentName = matchLocalPreset(text) ?? 'unknown';
    const params = intent === 'unknown' ? FALLBACK_EFFECT : INTENT_EFFECTS[intent];
    const fx: EffectEvent = {
      palette: [...params.palette],
      motion: params.motion,
      spirit_action: params.spirit_action,
      duration_ms: params.duration_ms,
      brightness: params.brightness,
      seed: (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0,
    };
    gameRef.current?.castRitual(fx);
    playCastChime();
    setCast({ line: INTENT_REPLY[intent], intent, source: 'local_rule' });
  }, []);

  const reply = (
    <>
      <p
        style={{
          margin: 0,
          fontStyle: 'italic',
          color: '#f4efe4',
          lineHeight: 1.5,
          textShadow: fill ? '0 1px 8px rgba(0,0,0,0.7)' : undefined,
        }}
      >
        “{cast.line}”
      </p>
      <span
        style={{
          fontSize: '0.72rem',
          padding: '0.15rem 0.5rem',
          borderRadius: '999px',
          border: '1px solid rgba(244,239,228,0.35)',
          backgroundColor: fill ? 'rgba(16,21,17,0.55)' : undefined,
          color: fill ? '#f4efe4' : '#8a8471',
          whiteSpace: 'nowrap',
        }}
      >
        {cast.intent} · {cast.source}
      </span>
    </>
  );

  if (fill) {
    return (
      <div style={{ position: 'absolute', inset: 0 }}>
        <GameCanvas onReady={onReady} layout="fill" />
        <div
          style={{
            position: 'absolute',
            top: 'max(56px, calc(env(safe-area-inset-top) + 44px))',
            left: 'max(12px, env(safe-area-inset-left))',
            right: 'max(12px, env(safe-area-inset-right))',
            display: 'flex',
            alignItems: 'baseline',
            gap: '0.75rem',
            flexWrap: 'wrap',
            pointerEvents: 'none',
          }}
        >
          {reply}
        </div>
        <div
          style={{
            position: 'absolute',
            left: 'max(12px, env(safe-area-inset-left))',
            right: 'max(12px, env(safe-area-inset-right))',
            bottom: 'max(12px, env(safe-area-inset-bottom))',
            maxWidth: '36rem',
            margin: '0 auto',
          }}
        >
          <RitualBar onCast={onCast} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '0.75rem',
          marginBottom: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        {reply}
      </div>
      <GameCanvas onReady={onReady} />
      <div style={{ marginTop: '1rem' }}>
        <RitualBar onCast={onCast} />
      </div>
      <p style={{ marginTop: '0.9rem', fontSize: '0.82rem', color: '#8a8471', lineHeight: 1.6 }}>
        Move: WASD / arrows / left stick · Jump: Space · H: swap hero · Drag to look around · Spells
        play instantly on this device; nothing is sent anywhere yet.
      </p>
    </div>
  );
}
