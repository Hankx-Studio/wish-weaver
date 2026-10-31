import Link from 'next/link';
import PlayClient from './PlayClient';

export const metadata = { title: 'Classic Demo — Spirit Companion' };

// Classic three.js demo, fullscreen. The main game moved to /play (Godot).
export default async function ClassicPage() {
  return (
    <main
      style={{
        position: 'relative',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#101512',
      }}
    >
      <PlayClient layout="fill" />
      <div
        style={{
          position: 'absolute',
          top: 'max(12px, env(safe-area-inset-top))',
          right: 'max(12px, env(safe-area-inset-right))',
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
          href="/play"
          style={{
            pointerEvents: 'auto',
            fontSize: '0.8rem',
            color: '#10201c',
            backgroundColor: '#f2b544',
            padding: '0.4rem 0.8rem',
            borderRadius: '999px',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Play Godot
        </Link>
      </div>
    </main>
  );
}
