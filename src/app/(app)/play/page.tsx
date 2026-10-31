import Link from 'next/link';
import GodotEmbed from '@/features/godot/GodotEmbed';

export const metadata = { title: 'Play — Spirit Companion' };

// Main game (Demo v1): Godot build, guest mode, no login needed.
export default async function PlayPage() {
  return (
    <main style={{ maxWidth: '56rem', margin: '0 auto', padding: '2.5rem 1.25rem 3rem' }}>
      <h1
        style={{
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: '1.6rem',
          margin: '0 0 1rem',
        }}
      >
        The Gray Meadow
      </h1>
      <GodotEmbed mode="play" />
      <p style={{ marginTop: '0.9rem', fontSize: '0.82rem', color: '#8a8471', lineHeight: 1.6 }}>
        Move: WASD · Interact: E · Swap hero: T. Progress is not saved yet.{' '}
        <Link href="/classic" style={{ color: '#d9b36a' }}>
          Try the classic demo
        </Link>
        .
      </p>
    </main>
  );
}
