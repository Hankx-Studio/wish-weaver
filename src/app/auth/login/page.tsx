import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import GoogleLoginButton from './google-login-button';

export const metadata = { title: 'Sign in — Spirit Companion' };

function safeNext(value: string | string[] | undefined): string {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v.startsWith('/') && !v.startsWith('//') ? v : '/home';
}

// Already signed in? Skip straight to the app.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(safeNext(params.next));

  const failed = params.error === 'callback_failed';

  return (
    <main
      style={{
        maxWidth: '28rem',
        margin: '0 auto',
        padding: '4rem 1.25rem',
        color: '#f4efe4',
      }}
    >
      <h1
        style={{
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: '1.9rem',
          marginBottom: '0.5rem',
        }}
      >
        Sign in
      </h1>
      <p style={{ lineHeight: 1.6, marginBottom: '1.75rem', color: '#cfc8b4' }}>
        One account, one spirit. We use Google sign-in only — no passwords to
        remember, and your spirit stays with you across devices.
      </p>
      {failed && (
        <p
          role="alert"
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            backgroundColor: '#3a1d1d',
            color: '#ffb4a8',
            marginBottom: '1.25rem',
          }}
        >
          The sign-in callback failed. Please try again.
        </p>
      )}
      <GoogleLoginButton next={safeNext(params.next)} />
      <p
        style={{
          marginTop: '1.75rem',
          fontSize: '0.85rem',
          lineHeight: 1.6,
          color: '#8a8471',
        }}
      >
        First-time sign-in creates your profile and asks for privacy consent
        before you enter. See the privacy note on the home page.
      </p>
    </main>
  );
}
