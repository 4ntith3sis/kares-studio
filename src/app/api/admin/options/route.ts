import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/supabase/admin-auth';

/**
 * Kares Studio — Phase 6 admin options API (server, service role).
 * GET → colors + sizes untuk dropdown variant manager.
 */
export async function GET() {
  try {
    const gate = await requireAdmin();
    if ('response' in gate) return gate.response;
    const supabase = getServiceSupabase();
    const [{ data: colors, error: cErr }, { data: sizes, error: sErr }] =
      await Promise.all([
        supabase.from('colors').select('id, name, hex_code').order('name'),
        supabase.from('sizes').select('id, name, sort_order').order('sort_order'),
      ]);
    if (cErr) throw cErr;
    if (sErr) throw sErr;
    return NextResponse.json({ colors: colors ?? [], sizes: sizes ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'List failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
