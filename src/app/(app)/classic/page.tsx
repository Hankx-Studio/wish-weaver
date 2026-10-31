import Link from 'next/link';
import PlayClient from './PlayClient';

export const metadata = { title: 'Classic Demo — Spirit Companion' };

// Classic three.js demo, kept intact. The main game moved to /play (Godot).
export default async function ClassicPage() {
  return (
    <main style={{ maxWidth: '56rem', margin: '0 auto', padding: '2.5rem 1.25rem 3rem' }}>
      <h1
        style={{
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: '1.6rem',
          margin: '0 0 1rem',
        }}
      >
        The Gray Meadow — Classic
      </h1>
      <PlayClient />
      <p style={{ marginTop: '0.9rem', fontSize: '0.82rem', color: '#8a8471', lineHeight: 1.6 }}>
        This is the original three.js demo. The main quest now lives in{' '}
        <Link href="/play" style={{ color: '#d9b36a' }}>
          the Godot build
        </Link>
        .
      </p>
    </main>
  );
}
