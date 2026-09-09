import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/supabase/admin-auth';

/**
 * Kares Studio — Phase 6 admin colors API (server, service role).
 * POST { name, hex_code }: create a color for the product variant
 * manager. colors.name is unique — duplicates return 409 (the client
 * reuses the existing color instead).
 */
function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(req: Request) {
  let body: { name?: unknown; hex_code?: unknown };
  try {
    body = await req.json();
  } catch {
    return bad('Invalid JSON body.');
  }
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const hex =
    typeof body.hex_code === 'string' ? body.hex_code.trim().toUpperCase() : '';
  if (!name) return bad('Color name is required.');
  if (!/^#[0-9A-F]{6}$/.test(hex)) {
    return bad('hex_code must be #RRGGBB (e.g. #1E3A5F).');
  }
  try {
    const gate = await requireAdmin();
    if ('response' in gate) return gate.response;
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('colors')
      .insert({ name, hex_code: hex })
      .select('id, name, hex_code')
      .single();
    if (error) {
      if ((error as { code?: string }).code === '23505') {
        // Name taken — return the existing row so the client can reuse it.
        const { data: existing, error: getErr } = await supabase
          .from('colors')
          .select('id, name, hex_code')
          .eq('name', name)
          .maybeSingle();
        if (getErr) throw getErr;
        if (existing) {
          return NextResponse.json({ color: existing, reused: true });
        }
        return NextResponse.json(
          { error: `Warna "${name}" sudah ada.` },
          { status: 409 }
        );
      }
      throw error;
    }
    return NextResponse.json({ color: data }, { status: 201 });
  } catch (err) {
    const message =
      typeof (err as { message?: unknown })?.message === 'string' &&
      (err as { message: string }).message
        ? (err as { message: string }).message
        : 'Create failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
