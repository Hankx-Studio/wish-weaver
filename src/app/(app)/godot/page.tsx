import GodotEmbed from '@/features/godot/GodotEmbed';

export const metadata = { title: 'Play Godot — Spirit Companion' };

// Godot web-build slice (PR1): embeds the exported build via iframe.
// Mirrors the play page layout; the bridge (mode sync, events) arrives later.
export default async function GodotPage() {
  return (
    <main style={{ maxWidth: '56rem', margin: '0 auto', padding: '2.5rem 1.25rem 3rem' }}>
      <h1
        style={{
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: '1.6rem',
          margin: '0 0 1rem',
        }}
      >
        The Gray Meadow — Godot Build
      </h1>
      <GodotEmbed mode="play" />
      <p style={{ marginTop: '0.9rem', fontSize: '0.82rem', color: '#8a8471', lineHeight: 1.6 }}>
        Experimental Godot export of the meadow. Keyboard and gamepad input go straight
        to the build; progress is not saved yet.
      </p>
    </main>
  );
}
