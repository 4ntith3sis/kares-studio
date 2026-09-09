import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/supabase/admin-auth';
import { revalidateStorefront } from '@/lib/revalidate';

/**
 * Kares Studio — Phase 6 admin product-images API (server, service role).
 * GET ?product_id=: list ordered by sort_order.
 * POST: upload file → Storage product-images → insert row.
 *   body: FormData { product_id, file, sort_order? }
 * PATCH: reorder { items: [{ id, sort_order }] }.
 * DELETE ?id=: delete row + Storage object (only when that object is
 *   not referenced by another row — same file reused guard).
 */
function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

const BUCKET = 'product-images';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get('product_id');
  if (!productId) return bad('product_id is required.');
  try {
    const gate = await requireAdmin();
    if ('response' in gate) return gate.response;
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('product_images')
      .select('id, image_url, sort_order, created_at')
      .eq('product_id', productId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return NextResponse.json({ images: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'List failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return bad('Expected multipart FormData.');
  }
  const productId = form.get('product_id');
  const file = form.get('file');
  if (typeof productId !== 'string' || !productId) {
    return bad('product_id is required.');
  }
  if (!(file instanceof File) || file.size === 0) {
    return bad('A valid image file is required.');
  }
  if (!file.type.startsWith('image/')) return bad('File must be an image.');
  if (file.size > 5 * 1024 * 1024) {
    return bad('Image must be ≤ 5 MB.');
  }

  try {
    const gate = await requireAdmin();
    if ('response' in gate) return gate.response;
    const supabase = getServiceSupabase();
    const ext = (file.name.split('.').pop() ?? 'jpg')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') || 'jpg';
    const objectPath = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, file, {
        contentType: file.type,
        upsert: false,
      });
    if (upErr) throw upErr;

    const { data: existing } = await supabase
      .from('product_images')
      .select('sort_order')
      .eq('product_id', productId)
      .order('sort_order', { ascending: false })
      .limit(1);
    const nextOrder =
      ((existing as { sort_order: number }[] | null)?.[0]?.sort_order ?? 0) + 1;

    const { data, error } = await supabase
      .from('product_images')
      .insert({
        product_id: productId,
        image_url: objectPath,
        sort_order: nextOrder,
      })
      .select('id, image_url, sort_order')
      .single();
    if (error) {
      await supabase.storage.from(BUCKET).remove([objectPath]);
      throw error;
    }
    revalidateStorefront(['/collection', '/', 'product']);
    return NextResponse.json({ image: data }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  let body: { items?: { id: string; sort_order: number }[] };
  try {
    body = await req.json();
  } catch {
    return bad('Invalid JSON body.');
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return bad('items[] is required.');
  }
  try {
    const gate = await requireAdmin();
    if ('response' in gate) return gate.response;
    const supabase = getServiceSupabase();
    for (const item of body.items) {
      if (typeof item?.id !== 'string' || !Number.isInteger(item?.sort_order)) {
        return bad('Each item needs id + integer sort_order.');
      }
      const { error } = await supabase
        .from('product_images')
        .update({ sort_order: item.sort_order })
        .eq('id', item.id);
      if (error) throw error;
    }
    revalidateStorefront(['/collection', '/', 'product']);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Reorder failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return bad('Image id is required.');
  try {
    const gate = await requireAdmin();
    if ('response' in gate) return gate.response;
    const supabase = getServiceSupabase();
    const { data: row, error: getErr } = await supabase
      .from('product_images')
      .select('id, image_url')
      .eq('id', id)
      .maybeSingle();
    if (getErr) throw getErr;
    if (!row) return bad('Image not found.', 404);

    const { error: delErr } = await supabase
      .from('product_images')
      .delete()
      .eq('id', id);
    if (delErr) throw delErr;

    // Remove the Storage object only when no other row references it.
    const path = (row as { image_url: string }).image_url;
    if (!path.startsWith('http') && !path.startsWith('/')) {
      const { count } = await supabase
        .from('product_images')
        .select('id', { count: 'exact', head: true })
        .eq('image_url', path);
      if ((count ?? 0) === 0) {
        await supabase.storage.from(BUCKET).remove([path]);
      }
    }
    revalidateStorefront(['/collection', '/', 'product']);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Delete failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
