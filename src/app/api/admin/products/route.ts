import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/supabase/admin-auth';
import { isMissingColumnError } from '@/lib/admin';
import { revalidateStorefront } from '@/lib/revalidate';

/**
 * Kares Studio — Phase 6 admin products API (server, service role only).
 * GET: list with category + primary image + variant count.
 * POST: create product (+ optional variants, deduped).
 * PATCH: update fields / toggle is_active / featured.
 * DELETE: hard delete only when product has NO variants & NO images
 *   (otherwise 409 — use is_active=false to hide from storefront).
 */

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function GET() {
  try {
    const gate = await requireAdmin();
    if ('response' in gate) return gate.response;
    const supabase = getServiceSupabase();
    // Tolerant of a DB without the Phase 6 is_active column.
    let rows: unknown[] | null = null;
    let hasActiveCol = true;
    const withActive = await supabase
      .from('products')
      .select(
        'id, name, slug, price, featured, is_active, created_at, category:categories(id, name, slug)'
      )
      .order('created_at', { ascending: false });
    if (!withActive.error) {
      rows = withActive.data;
    } else if (isMissingColumnError(withActive.error)) {
      hasActiveCol = false;
      const legacy = await supabase
        .from('products')
        .select(
          'id, name, slug, price, featured, created_at, category:categories(id, name, slug)'
        )
        .order('created_at', { ascending: false });
      if (legacy.error) throw legacy.error;
      rows = legacy.data;
    } else {
      throw withActive.error;
    }
    const products = rows;

    const ids = ((products ?? []) as { id: string }[]).map((p) => p.id);
    let primaryByProduct = new Map<string, string>();
    let countByProduct = new Map<string, number>();
    if (ids.length > 0) {
      const [{ data: images }, { data: variants }] = await Promise.all([
        supabase
          .from('product_images')
          .select('product_id, image_url, sort_order')
          .in('product_id', ids)
          .order('sort_order', { ascending: true }),
        supabase.from('product_variants').select('id, product_id').in('product_id', ids),
      ]);
      for (const img of ((images ?? []) as {
        product_id: string;
        image_url: string | null;
      }[])) {
        if (!primaryByProduct.has(img.product_id) && img.image_url) {
          primaryByProduct.set(img.product_id, img.image_url);
        }
      }
      for (const v of ((variants ?? []) as { product_id: string }[])) {
        countByProduct.set(
          v.product_id,
          (countByProduct.get(v.product_id) ?? 0) + 1
        );
      }
    }

    type Row = {
      id: string;
      name: string;
      slug: string;
      price: number;
      featured: boolean;
      is_active?: boolean;
      created_at: string;
      category:
        | { id: string; name: string; slug: string }
        | { id: string; name: string; slug: string }[]
        | null;
    };
    const norm = (c: Row['category']) =>
      c === null ? null : Array.isArray(c) ? (c[0] ?? null) : c;

    return NextResponse.json({
      products: (((products ?? []) as unknown as Row[]) ?? []).map((p) => ({
        ...p,
        is_active: hasActiveCol ? (p.is_active ?? true) : true,
        category: norm(p.category),
        primaryImage: primaryByProduct.get(p.id) ?? null,
        variantCount: countByProduct.get(p.id) ?? 0,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'List failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: {
    name?: unknown;
    category_id?: unknown;
    description?: unknown;
    material?: unknown;
    price?: unknown;
    featured?: unknown;
    is_active?: unknown;
    variants?: { color_id: string; size_id: string }[];
  };
  try {
    body = await req.json();
  } catch {
    return bad('Invalid JSON body.');
  }
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return bad('Product name is required.');
  const price = Number(body.price);
  if (!Number.isFinite(price) || price < 0 || !Number.isInteger(Math.round(price))) {
    return bad('Price must be a non-negative number.');
  }
  if (body.category_id !== undefined && body.category_id !== null && typeof body.category_id !== 'string') {
    return bad('category_id must be a UUID string or null.');
  }

  try {
    const gate = await requireAdmin();
    if ('response' in gate) return gate.response;
    const supabase = getServiceSupabase();
    const baseRow = {
      name,
      category_id: (body.category_id as string | null) ?? null,
      description:
        typeof body.description === 'string' && body.description.trim()
          ? body.description.trim()
          : null,
      material:
        typeof body.material === 'string' && body.material.trim()
          ? body.material.trim()
          : null,
      price: Math.round(price),
      featured: body.featured === true,
    };
    const withActive = {
      ...baseRow,
      is_active: body.is_active === undefined ? true : body.is_active === true,
    };
    let inserted = await supabase
      .from('products')
      .insert(withActive)
      .select('id, slug')
      .single();
    if (inserted.error && isMissingColumnError(inserted.error)) {
      // Phase 6 column not migrated yet — retry without is_active.
      inserted = await supabase
        .from('products')
        .insert(baseRow)
        .select('id, slug')
        .single() as typeof inserted;
    }
    if (inserted.error) throw inserted.error;
    const data = inserted.data;
    if (!data) throw new Error('Insert returned no row.');

    // Optional variants (deduped by color+size).
    const seen = new Set<string>();
    const rows = ((body.variants ?? []) as { color_id: string; size_id: string }[])
      .filter(
        (v) =>
          typeof v?.color_id === 'string' && typeof v?.size_id === 'string'
      )
      .filter((v) => {
        const k = `${v.color_id}:${v.size_id}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .map((v) => ({
        product_id: (data as { id: string }).id,
        color_id: v.color_id,
        size_id: v.size_id,
      }));
    if (rows.length > 0) {
      const { error: vErr } = await supabase
        .from('product_variants')
        .insert(rows);
      if (vErr) throw vErr;
    }
    revalidateStorefront(['/collection', '/', 'product']);
    return NextResponse.json({ product: data }, { status: 201 });
  } catch (err) {
    const message =
      typeof (err as { message?: unknown })?.message === 'string' &&
      (err as { message: string }).message
        ? (err as { message: string }).message
        : `Create failed (${String(err)}).`;
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
  const id = body.id;
  if (typeof id !== 'string' || !id) return bad('Product id is required.');

  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return bad('Product name must not be empty.');
    }
    patch.name = body.name.trim();
  }
  if (body.category_id !== undefined) {
    if (body.category_id !== null && typeof body.category_id !== 'string') {
      return bad('category_id must be a UUID string or null.');
    }
    patch.category_id = body.category_id;
  }
  for (const k of ['description', 'material'] as const) {
    if (body[k] !== undefined) {
      patch[k] =
        typeof body[k] === 'string' && (body[k] as string).trim()
          ? (body[k] as string).trim()
          : null;
    }
  }
  if (body.price !== undefined) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) {
      return bad('Price must be a non-negative number.');
    }
    patch.price = Math.round(price);
  }
  if (body.featured !== undefined) patch.featured = body.featured === true;
  if (body.is_active !== undefined) patch.is_active = body.is_active === true;
  if (Object.keys(patch).length === 0) return bad('Nothing to update.');

  try {
    const gate = await requireAdmin();
    if ('response' in gate) return gate.response;
    const supabase = getServiceSupabase();
    const doUpdate = async (withActive: boolean) => {
      const p = { ...patch };
      if (!withActive) delete p.is_active;
      return supabase
        .from('products')
        .update(p)
        .eq('id', id)
        .select(
          withActive
            ? 'id, name, slug, price, featured, is_active'
            : 'id, name, slug, price, featured'
        )
        .maybeSingle();
    };
    let result = await doUpdate(true);
    if (result.error && isMissingColumnError(result.error)) {
      result = await doUpdate(false);
    }
    if (result.error) throw result.error;
    const data = result.data;
    if (!data) return bad('Product not found.', 404);
    revalidateStorefront(['/collection', '/', 'product']);
    return NextResponse.json({ product: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const confirm = searchParams.get('confirm');
  if (!id) return bad('Product id is required.');

  try {
    const gate = await requireAdmin();
    if ('response' in gate) return gate.response;
    const supabase = getServiceSupabase();

    // Two-step hard delete: without ?confirm=1 return the impact summary
    // (variants, images, transactions, storage files) for the dialog.
    const { data: images } = await supabase
      .from('product_images')
      .select('id, image_url')
      .eq('product_id', id);
    const { data: variants } = await supabase
      .from('product_variants')
      .select('id')
      .eq('product_id', id);
    const variantIds = ((variants ?? []) as { id: string }[]).map((v) => v.id);
    let txnCount = 0;
    if (variantIds.length > 0) {
      const { count } = await supabase
        .from('inventory_transactions')
        .select('id', { count: 'exact', head: true })
        .in('variant_id', variantIds);
      txnCount = count ?? 0;
    }
    const imageRows = ((images ?? []) as { id: string; image_url: string }[]);
    const storagePaths = imageRows
      .map((r) => r.image_url)
      .filter((u) => !u.startsWith('http') && !u.startsWith('/'));

    if (confirm !== '1') {
      return NextResponse.json({
        confirmRequired: true,
        impact: {
          variants: variantIds.length,
          images: imageRows.length,
          transactions: txnCount,
          storageFiles: storagePaths.length,
        },
      });
    }

    // 1) Storage files first (DB rows still reference them for the guard).
    if (storagePaths.length > 0) {
      const { error: storErr } = await supabase.storage
        .from('product-images')
        .remove(storagePaths);
      if (storErr) throw new Error(`Storage cleanup failed: ${storErr.message}`);
    }
    // 2) DB rows: images → transactions → variants → product.
    //    (FK cascades cover images/variants/transactions, but explicit
    //    order keeps it safe even if constraints change.)
    const { error: imgErr } = await supabase
      .from('product_images')
      .delete()
      .eq('product_id', id);
    if (imgErr) throw imgErr;
    if (variantIds.length > 0) {
      const { error: txnErr } = await supabase
        .from('inventory_transactions')
        .delete()
        .in('variant_id', variantIds);
      if (txnErr) throw txnErr;
      const { error: varErr } = await supabase
        .from('product_variants')
        .delete()
        .eq('product_id', id);
      if (varErr) throw varErr;
    }
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    revalidateStorefront(['/collection', '/', 'product']);
    return NextResponse.json({
      ok: true,
      deleted: {
        variants: variantIds.length,
        images: imageRows.length,
        transactions: txnCount,
        storageFiles: storagePaths.length,
      },
    });
  } catch (err) {
    const message =
      typeof (err as { message?: unknown })?.message === 'string' &&
      (err as { message: string }).message
        ? (err as { message: string }).message
        : `Delete failed (${String(err)}).`;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
