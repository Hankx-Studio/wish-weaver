import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

type CookiesToSet = Array<{ name: string; value: string; options: CookieOptions }>;

// True when the deployment can talk to Supabase at all. Pages must check
// this before createClient(): without env, createServerClient throws and
// the whole page 500s. Never throw from here.
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

// Server-side Supabase client for Server Components, Server Actions,
// and Route Handlers. Public anon key only; RLS still applies.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookiesToSet) {
          // setAll from a Server Component is a no-op (read-only cookies);
          // middleware refreshes the session cookies instead.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // ignore: called from a Server Component
          }
        },
      },
    },
  );
}
