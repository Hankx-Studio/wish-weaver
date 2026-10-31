import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import GodotEmbed from '@/features/godot/GodotEmbed';

export const metadata = { title: 'Spirit Companion — The Gray Meadow' };

// Landing: the live Godot build runs full-bleed behind a quiet overlay.
// Guest-first: entering the meadow needs no account; sign-in is optional.
export default async function LandingPage() {
  let user: User | null = null;
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      user = (await supabase.auth.getUser()).data.user;
    } catch {
      user = null;
    }
  }

  return (
    <main
      style={{
        position: 'relative',
        minHeight: '100vh',
        overflow: 'hidden',
        backgroundColor: '#10201c',
      }}
    >
      <GodotEmbed mode="ambient" layout="fill" className="sc-ambient" />
      {/* Legibility scrim over the live scene */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(10, 18, 16, 0.62) 0%, rgba(10, 18, 16, 0.18) 42%, rgba(10, 18, 16, 0.78) 100%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          maxWidth: '56rem',
          margin: '0 auto',
          padding: '0 1.25rem',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          paddingBottom: 'max(3rem, env(safe-area-inset-bottom))',
        }}
      >
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', letterSpacing: '0.14em', color: '#d9b36a' }}>
          SPIRIT COMPANION
        </p>
        <h1
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 'clamp(2.2rem, 6vw, 3.6rem)',
            lineHeight: 1.05,
            margin: '0 0 0.75rem',
            textWrap: 'balance',
          }}
        >
          The Gray Meadow
        </h1>
        <p style={{ margin: '0 0 1.75rem', maxWidth: '34rem', lineHeight: 1.65, color: '#e6dfce' }}>
          The Tree of Light is going dark. Guide your wisp, gather three
          blessings, and relight the meadow — no account needed.
        </p>
        <div style={{ display: 'flex', gap: '0.9rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <Link
            href="/play"
            style={{
              display: 'inline-block',
              padding: '0.85rem 2rem',
              fontWeight: 700,
              fontSize: '1.05rem',
              color: '#10201c',
              backgroundColor: '#f2b544',
              borderRadius: '10px',
              textDecoration: 'none',
            }}
          >
            Enter the Meadow
          </Link>
          {user ? (
            <Link href="/home" style={{ color: '#e6dfce', fontSize: '0.95rem' }}>
              Continue to Home →
            </Link>
          ) : (
            <Link href="/auth/login" style={{ color: '#e6dfce', fontSize: '0.95rem' }}>
              Sign in with Google
            </Link>
          )}
          <Link href="/classic" style={{ color: '#8a8471', fontSize: '0.95rem' }}>
            Classic demo
          </Link>
        </div>
        <p style={{ margin: '1.5rem 0 0', fontSize: '0.78rem', color: '#8a8471', lineHeight: 1.6 }}>
          WASD to walk · E to interact · T to swap hero · Guest progress is not saved yet.
        </p>
      </div>

      <style>{`@media (prefers-reduced-motion: reduce) {
  .sc-ambient { display: none; }
}`}</style>
    </main>
  );
}
