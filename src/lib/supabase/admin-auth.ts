import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * Kares Studio — admin API session guard (server only).
 * Returns the authenticated user or a 401 response. Uses the anon key
 * + auth cookies — NEVER the service role key for identity.
 * NOTE: any authenticated Supabase user can reach admin APIs until an
 * admin role/allowlist is configured (documented next step).
 */
export async function requireAdmin(): Promise<
  | { user: { id: string; email?: string }; supabase: ReturnType<typeof makeClient> }
  | { response: NextResponse }
> {
  const supabase = makeClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return {
      response: NextResponse.json(
        { error: 'Unauthorized — silakan login sebagai admin.' },
        { status: 401 }
      ),
    };
  }
  return { user, supabase };
}

function makeClient() {
  const cookieStore = cookies();
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {
          /* route handlers manage cookies via middleware refresh */
        },
      },
    }
  );
}
