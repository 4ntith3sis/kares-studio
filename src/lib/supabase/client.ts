import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client (public anon key only).
 * Never import Service Role Key here.
 */
export function createClient() {
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey!
  );
}
