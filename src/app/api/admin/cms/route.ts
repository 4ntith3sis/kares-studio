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
    // Capture old image paths for safe Storage cleanup after upsert.
    const imageKeys = clean.filter((r) => r.image_url !== undefined);
    let oldPaths: Record<string, string | null> = {};
    if (imageKeys.length > 0) {
      const { data: current } = await supabase
        .from('homepage_content')
        .select('section, key, image_url')
        .in(
          'section',
          Array.from(new Set(imageKeys.map((r) => r.section as string)))
        );
      for (const row of ((current ?? []) as {
        section: string;
        key: string;
        image_url: string | null;
      }[])) {
        oldPaths[`${row.section}.${row.key}`] = row.image_url;
      }
    }
    const { error } = await supabase
      .from('homepage_content')
      .upsert(clean, { onConflict: 'section,key' });
    if (error) throw error;
    // Remove replaced Storage objects when no other row references them.
    for (const r of imageKeys) {
      const k = `${r.section}.${r.key}`;
      const oldPath = oldPaths[k];
      const next = r.image_url as string | null;
      if (
        oldPath &&
        oldPath !== next &&
        !oldPath.startsWith('http') &&
        !oldPath.startsWith('/')
      ) {
        const { count } = await supabase
          .from('homepage_content')
          .select('section', { count: 'exact', head: true })
          .eq('image_url', oldPath);
        if ((count ?? 0) === 0) {
          await supabase.storage.from('product-images').remove([oldPath]);
        }
      }
    }
    revalidateStorefront(['/', '/about', '/contact']);
    return NextResponse.json({ ok: true, updated: clean.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Save failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
