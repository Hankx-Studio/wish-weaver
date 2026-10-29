import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Refresh auth cookies on every request; gate logged-in routes.
// updateSession must never take the whole site down: on any failure the
// request continues unauthenticated (public pages load, gated ones redirect).
export async function middleware(request: NextRequest) {
  let response: NextResponse;
  let user: Awaited<ReturnType<typeof updateSession>>['user'];
  try {
    ({ response, user } = await updateSession(request));
  } catch {
    response = NextResponse.next({ request });
    user = null;
  }

  const pathname = request.nextUrl.pathname;
  const gated = pathname.startsWith('/home') || pathname.startsWith('/play');
  if (gated && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
