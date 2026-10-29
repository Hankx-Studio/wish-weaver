import { redirect } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';

export const metadata = { title: 'Home — Spirit Companion' };

// Minimal logged-in home (M1): greets the user, confirms session identity,
// offers sign-out. Gated by middleware; double-checked here.
export default async function HomePage() {
  if (!isSupabaseConfigured()) redirect('/auth/login?next=/home');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/home');

  async function signOut() {
    'use server';
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/');
  }

  return (
    <main style={{ maxWidth: '40rem', margin: '0 auto', padding: '4rem 1.25rem' }}>
      <p style={{ color: '#8a8471', margin: '0 0 0.5rem' }}>Signed in as</p>
      <h1
        style={{
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: '2rem',
          margin: '0 0 1rem',
          overflowWrap: 'anywhere',
        }}
      >
        {user.email ?? 'your spirit keeper account'}
      </h1>
      <p style={{ lineHeight: 1.65, color: '#cfc8b4' }}>
        Welcome home. Your spirit hatches here in the next milestone — spoken
        rituals, light effects, and your first evolution are on the way.
      </p>
      <div style={{ marginTop: '2rem', display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
        <a
          href="/play"
          style={{
            display: 'inline-block',
            padding: '0.7rem 1.4rem',
            fontSize: '0.95rem',
            fontWeight: 600,
            color: '#191510',
            backgroundColor: '#d9b36a',
            borderRadius: '8px',
            textDecoration: 'none',
          }}
        >
          Enter the world
        </a>
      </div>
      <form action={signOut} style={{ marginTop: '1rem' }}>
        <button
          type="submit"
          style={{
            padding: '0.7rem 1.4rem',
            fontSize: '0.95rem',
            fontWeight: 600,
            color: '#f4efe4',
            backgroundColor: 'transparent',
            border: '1px solid #2c423b',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
