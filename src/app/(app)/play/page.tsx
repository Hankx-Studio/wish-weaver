import Link from 'next/link';
import GodotEmbed from '@/features/godot/GodotEmbed';

export const metadata = { title: 'Play — Spirit Companion' };

// Main game (Demo v1): fullscreen Godot build, guest mode, no login needed.
export default async function PlayPage() {
  return (
    <main
      style={{
        position: 'relative',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#101512',
      }}
    >
      <GodotEmbed mode="play" layout="fill" />
      <div
        style={{
          position: 'absolute',
          top: 'max(12px, env(safe-area-inset-top))',
          left: 'max(12px, env(safe-area-inset-left))',
          display: 'flex',
          gap: '0.6rem',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        <Link
          href="/"
          style={{
            pointerEvents: 'auto',
            fontSize: '0.8rem',
            color: '#f4efe4',
            backgroundColor: 'rgba(16,21,17,0.55)',
            padding: '0.4rem 0.8rem',
            borderRadius: '999px',
            textDecoration: 'none',
          }}
        >
          ← Meadow
        </Link>
        <Link
          href="/classic"
          style={{
            pointerEvents: 'auto',
            fontSize: '0.8rem',
            color: '#f4efe4',
            backgroundColor: 'rgba(16,21,17,0.55)',
            padding: '0.4rem 0.8rem',
            borderRadius: '999px',
            textDecoration: 'none',
          }}
        >
          Classic
        </Link>
      </div>
      <p
        style={{
          position: 'absolute',
          bottom: 'max(10px, env(safe-area-inset-bottom))',
          left: 0,
          right: 0,
          margin: 0,
          textAlign: 'center',
          fontSize: '0.72rem',
          color: 'rgba(244,239,228,0.6)',
          textShadow: '0 1px 6px rgba(0,0,0,0.7)',
          pointerEvents: 'none',
        }}
      >
        WASD move · E interact · T swap hero
      </p>
    </main>
  );
}
