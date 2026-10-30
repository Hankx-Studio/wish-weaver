'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function GoogleLoginButton({ next }: { next: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setError(error.message);
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={signIn}
        disabled={busy}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.8rem 1.6rem',
          fontSize: '1rem',
          fontWeight: 600,
          color: '#10201c',
          backgroundColor: '#f2b544',
          border: 'none',
          borderRadius: '8px',
          cursor: busy ? 'wait' : 'pointer',
          opacity: busy ? 0.7 : 1,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            width: '1.25rem',
            height: '1.25rem',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            backgroundColor: '#10201c',
            color: '#f2b544',
            borderRadius: '50%',
            fontSize: '0.85rem',
          }}
        >
          G
        </span>
        {busy ? 'Opening Google…' : 'Begin with Google'}
      </button>
      {error && (
        <p role="alert" style={{ marginTop: '0.75rem', color: '#e5484d' }}>
          Sign-in failed: {error}
        </p>
      )}
    </div>
  );
}
