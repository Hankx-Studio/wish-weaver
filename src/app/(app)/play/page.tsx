import { redirect } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import PlayClient from './PlayClient';

export const metadata = { title: 'Play — Spirit Companion' };

// Gated play page (M2 slice): the game world. Authenticated only.
export default async function PlayPage() {
  if (!isSupabaseConfigured()) redirect('/auth/login?next=/play');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/play');

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
