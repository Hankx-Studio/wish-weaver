'use client';

import { useState } from 'react';

export type GodotEmbedMode = 'play' | 'ambient';

interface GodotEmbedProps {
  mode: GodotEmbedMode;
  className?: string;
}

// PR1: postMessage-free iframe embed of the Godot web build served from
// /godot/index.html. Shows a loading shimmer until the iframe fires onLoad.
// No JS bridge yet — mode is passed as a query param only.
export default function GodotEmbed({ mode, className }: GodotEmbedProps) {
  const [loaded, setLoaded] = useState<boolean>(false);
  const src = `/godot/index.html?mode=${mode}`;

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: 'clamp(340px, 62vh, 600px)',
        borderRadius: '12px',
        overflow: 'hidden',
        backgroundColor: '#171d19',
      }}
    >
      {!loaded && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(100deg, #1d2421 30%, #2b3531 45%, #1d2421 60%)',
            backgroundSize: '200% 100%',
            animation: 'godot-embed-shimmer 1.4s ease-in-out infinite',
          }}
        />
      )}
      <iframe
        src={src}
        title={mode === 'play' ? 'Spirit Companion — Godot build' : 'Spirit Companion — ambient scene'}
        onLoad={() => setLoaded(true)}
        allow="autoplay; fullscreen; gamepad"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          border: 0,
          borderRadius: '12px',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 300ms ease-in',
        }}
      />
      <style>{`@keyframes godot-embed-shimmer {
  0% { background-position: 180% 0; }
  100% { background-position: -80% 0; }
}`}</style>
    </div>
  );
}
