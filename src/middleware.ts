import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

/**
 * Kares Studio — admin route guard.
 * /admin/login is public; every other /admin* page requires a Supabase
 * session, otherwise redirect to /admin/login?next=<path>.
 * API routes (/api/admin/*) enforce their own session check via
 * requireAdmin() — middleware only handles page redirects.
 */
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (!pathname.startsWith('/admin')) return NextResponse.next();
  if (pathname === '/admin/login') return NextResponse.next();

  const res = NextResponse.next();
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const login = new URL('/admin/login', req.url);
    login.searchParams.set('next', pathname + search);
    return NextResponse.redirect(login);
  }
  return res;
}

export const config = {
  matcher: ['/admin/:path*'],
};
