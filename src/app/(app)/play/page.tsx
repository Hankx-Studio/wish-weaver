import PlayClient from './PlayClient';

export const metadata = { title: 'Play — Spirit Companion' };

// Public play page (Demo v1): the game world, no login needed.
// Account/progress persistence arrives in a later slice.
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
      <PlayClient />
    </main>
  );
}
