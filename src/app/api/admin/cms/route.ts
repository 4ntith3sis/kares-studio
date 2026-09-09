import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/supabase/admin-auth';
import { revalidateStorefront } from '@/lib/revalidate';

/**
 * Kares Studio — Phase 6 admin CMS API (server, service role).
 * GET: all homepage_content rows grouped by section.
 * PATCH { entries: [{ section, key, value?, image_url? }] }:
 *   upserts content fields (text/image only — never layout).
 */
function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function GET() {
  try {
    const gate = await requireAdmin();
    if ('response' in gate) return gate.response;
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('homepage_content')
      .select('section, key, value, image_url, updated_at')
      .order('section', { ascending: true })
      .order('key', { ascending: true });
    if (error) {
      // Missing table (PGRST205) = migration 0002 not applied yet.
      if (
        (error as { code?: string }).code === 'PGRST205' ||
        /could not find the table/i.test(error.message ?? '')
      ) {
        return NextResponse.json(
          {
            error:
              'Tabel homepage_content belum ada. Jalankan supabase/migrations/0002_phase6_admin_cms.sql satu kali di Supabase SQL Editor, lalu refresh.',
            needsMigration: true,
          },
          { status: 503 }
        );
      }
      throw error;
    }
    return NextResponse.json({ entries: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'List failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  let body: {
    entries?: { section: string; key: string; value?: string | null; image_url?: string | null }[];
  };
  try {
    body = await req.json();
  } catch {
    return bad('Invalid JSON body.');
  }
  if (!Array.isArray(body.entries) || body.entries.length === 0) {
    return bad('entries[] is required.');
  }
  for (const e of body.entries) {
    if (typeof e?.section !== 'string' || !e.section.trim()) {
      return bad('Each entry needs a section.');
    }
    if (typeof e?.key !== 'string' || !e.key.trim()) {
      return bad('Each entry needs a key.');
    }
    if (e.section.length > 60 || e.key.length > 60) {
      return bad('section/key too long (max 60).');
    }
    if (typeof e.value === 'string' && e.value.length > 5000) {
      return bad(`Value too long for ${e.section}.${e.key} (max 5000).`);
    }
    if (typeof e.image_url === 'string' && e.image_url.length > 500) {
      return bad(`image_url too long for ${e.section}.${e.key}.`);
    }
  }

  try {
    const gate = await requireAdmin();
    if ('response' in gate) return gate.response;
    const supabase = getServiceSupabase();
    const rows = body.entries.map((e) => ({
      section: e.section.trim(),
      key: e.key.trim(),
      value:
        typeof e.value === 'string'
          ? e.value
          : e.value === null
            ? null
            : undefined,
      image_url:
        typeof e.image_url === 'string'
          ? e.image_url
          : e.image_url === null
            ? null
            : undefined,
    }));
    // Strip undefined so existing columns are preserved on partial updates.
    const clean = rows.map((r) => {
      const out: Record<string, unknown> = {
        section: r.section,
        key: r.key,
      };
      if (r.value !== undefined) out.value = r.value;
      if (r.image_url !== undefined) out.image_url = r.image_url;
      return out;
    });
    const { error } = await supabase
      .from('homepage_content')
      .upsert(clean, { onConflict: 'section,key' });
    if (error) throw error;
    revalidateStorefront(['/']);
    return NextResponse.json({ ok: true, updated: clean.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Save failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
