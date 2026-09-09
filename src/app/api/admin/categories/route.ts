import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/supabase/admin-auth';
import { revalidateStorefront } from '@/lib/revalidate';

/**
 * Kares Studio — Phase 6 admin categories API (server, service role).
 * GET: list with product counts. POST: create. PATCH: rename/describe/
 * image. DELETE: blocked (409) when products still reference the
 * category — reassign or delete those products first.
 */
function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function GET() {
  try {
    const gate = await requireAdmin();
    if ('response' in gate) return gate.response;
    const supabase = getServiceSupabase();
    const [{ data: categories, error }, { data: products }] = await Promise.all([
      supabase
        .from('categories')
        .select('id, name, slug, description, image_url, created_at')
        .order('name', { ascending: true }),
      supabase.from('products').select('id, category_id'),
    ]);
    if (error) throw error;
    const countByCat = new Map<string, number>();
    for (const p of ((products ?? []) as { category_id: string | null }[])) {
      if (p.category_id) {
        countByCat.set(p.category_id, (countByCat.get(p.category_id) ?? 0) + 1);
      }
    }
    return NextResponse.json({
      categories: (((categories ?? []) as { id: string }[]) ?? []).map(
        (c) => ({ ...c, productCount: countByCat.get(c.id) ?? 0 })
      ),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'List failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: { name?: unknown; description?: unknown; image_url?: unknown };
  try {
    body = await req.json();
  } catch {
    return bad('Invalid JSON body.');
  }
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return bad('Category name is required.');
  try {
    const gate = await requireAdmin();
    if ('response' in gate) return gate.response;
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('categories')
      .insert({
        name,
        description:
          typeof body.description === 'string' && body.description.trim()
            ? body.description.trim()
            : null,
        image_url:
          typeof body.image_url === 'string' && body.image_url.trim()
            ? body.image_url.trim()
            : null,
      })
      .select('id, name, slug')
      .single();
    if (error) throw error;
    revalidateStorefront(['/collection', '/']);
    return NextResponse.json({ category: data }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Create failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return bad('Invalid JSON body.');
  }
  if (typeof body.id !== 'string' || !body.id) {
    return bad('Category id is required.');
  }
  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return bad('Category name must not be empty.');
    }
    patch.name = (body.name as string).trim();
  }
  for (const k of ['description', 'image_url'] as const) {
    if (body[k] !== undefined) {
      patch[k] =
        typeof body[k] === 'string' && (body[k] as string).trim()
          ? (body[k] as string).trim()
          : null;
    }
  }
  if (Object.keys(patch).length === 0) return bad('Nothing to update.');
  try {
    const gate = await requireAdmin();
    if ('response' in gate) return gate.response;
    const supabase = getServiceSupabase();
    // Capture the old image path for safe replacement cleanup.
    let oldPath: string | null = null;
    if (patch.image_url !== undefined) {
      const { data: current } = await supabase
        .from('categories')
        .select('image_url')
        .eq('id', body.id as string)
        .maybeSingle();
      oldPath = (current as { image_url: string | null } | null)?.image_url ?? null;
    }
    const { data, error } = await supabase
      .from('categories')
      .update(patch)
      .eq('id', body.id as string)
      .select('id, name, slug, description, image_url')
      .maybeSingle();
    if (error) throw error;
    if (!data) return bad('Category not found.', 404);
    // Remove the replaced Storage object when it is a category-owned
    // path and no other category references it.
    const next = (data as { image_url: string | null }).image_url;
    if (
      oldPath &&
      oldPath !== next &&
      oldPath.startsWith('category/') &&
      !oldPath.startsWith('http') &&
      !oldPath.startsWith('/')
    ) {
      const { count } = await supabase
        .from('categories')
        .select('id', { count: 'exact', head: true })
        .eq('image_url', oldPath);
      if ((count ?? 0) === 0) {
        await supabase.storage.from('product-images').remove([oldPath]);
      }
    }
    revalidateStorefront(['/collection', '/']);
    return NextResponse.json({ category: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return bad('Category id is required.');
  try {
    const gate = await requireAdmin();
    if ('response' in gate) return gate.response;
    const supabase = getServiceSupabase();
    const { count } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id);
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        {
          error: `Category is used by ${count} product(s). Reassign them first — deleting would orphan catalog data.`,
        },
        { status: 409 }
      );
    }
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
    revalidateStorefront(['/collection', '/']);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Delete failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
