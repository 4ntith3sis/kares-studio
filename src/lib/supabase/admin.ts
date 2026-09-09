import { createClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client with the Service Role key.
 *
 * Used EXCLUSIVELY by /admin API routes (server side). Bypasses RLS so
 * the dashboard can read/write catalog, inventory and CMS content.
 * NEVER import this from client components — the key must never reach
 * the browser. Client code keeps using getSupabase() (anon key).
 */
export function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Admin API routes require the service role key server-side.'
    );
  }
  return createClient(url, serviceKey);
}
