import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';

export const metadata = { title: 'Spirit Companion — speak, and magic appears' };

// Public landing page (F-01, M1 slice): hero, status board, sign-in entry.
// English UI only. No login required to view.
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
    <main style={{ maxWidth: '56rem', margin: '0 auto', padding: '0 1.25rem 4rem' }}>
      {/* Hero: light orb + plain statement, side by side on wide screens */}
      <section
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '2rem',
          alignItems: 'center',
          padding: '4rem 0 3rem',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: '7rem',
            height: '7rem',
            borderRadius: '50%',
            flexShrink: 0,
            backgroundColor: '#f2b544',
            boxShadow: '0 0 64px 12px rgba(242, 181, 68, 0.45)',
          }}
        />
        <div style={{ flex: '1 1 20rem' }}>
          <h1
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: '2.4rem',
              lineHeight: 1.15,
              margin: '0 0 0.75rem',
            }}
          >
            A spirit that grows with your kindness
          </h1>
          <p style={{ lineHeight: 1.65, color: '#cfc8b4', margin: '0 0 1.5rem' }}>
            Speak a blessing and watch magic appear as light. Daily rituals
            raise your spirit — and the kindness you gather can become real
            goods shared with others.
          </p>
          {user ? (
            <Link
              href="/home"
              style={{
                display: 'inline-block',
                padding: '0.8rem 1.6rem',
                fontWeight: 600,
                color: '#10201c',
                backgroundColor: '#f2b544',
                borderRadius: '8px',
                textDecoration: 'none',
              }}
            >
              Continue to Home
            </Link>
          ) : (
            <Link
              href="/auth/login"
              style={{
                display: 'inline-block',
                padding: '0.8rem 1.6rem',
                fontWeight: 600,
                color: '#10201c',
                backgroundColor: '#f2b544',
                borderRadius: '8px',
                textDecoration: 'none',
              }}
            >
              Begin with Google
            </Link>
          )}
          <p style={{ margin: '1rem 0 0', fontSize: '0.9rem' }}>
            <Link href="/play" style={{ color: '#d9b36a' }}>
              or explore the demo without signing in →
            </Link>
          </p>
        </div>
      </section>

      {/* Milestone 1 status board */}
      <section
        aria-label="Milestone 1 status"
        style={{
          borderTop: '1px solid #2c423b',
          paddingTop: '2rem',
        }}
      >
        <h2
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: '1.4rem',
            margin: '0 0 1rem',
          }}
        >
          Milestone 1 — what works today
        </h2>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, lineHeight: 2 }}>
          <li>✅ This page — public, no login needed</li>
          <li>✅ Google sign-in — one account, one spirit</li>
          <li>🧪 Spoken rituals — voice input arrives next</li>
          <li>🧪 Spirit evolution — first evolution arrives next</li>
          <li>🎬 Goods sharing — concept preview coming soon</li>
        </ul>
      </section>

      {/* Privacy note */}
      <footer
        style={{
          borderTop: '1px solid #2c423b',
          marginTop: '2.5rem',
          paddingTop: '1.5rem',
          fontSize: '0.85rem',
          lineHeight: 1.6,
          color: '#8a8471',
        }}
      >
        <p style={{ margin: 0 }}>
          Privacy: sign-in uses Google OAuth via Supabase Auth. Ritual voice is
          processed to text and never stored as audio. Full consent is asked on
          first entry; you can export or delete your data from Settings.
        </p>
      </footer>
    </main>
  );
}
