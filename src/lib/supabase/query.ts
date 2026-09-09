import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Shared query client for the Phase 1 service layer.
 * Uses the public publishable key (RLS applies). Works on server & client.
 * Accepts both NEXT_PUBLIC_SUPABASE_ANON_KEY (legacy) and
 * NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (new Supabase key format).
 * Service Role Key is never used here.
 */
export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY). Copy .env.example to .env and fill in your Supabase project keys.'
    );
  }

  return createSupabaseClient(url, anonKey);
}
