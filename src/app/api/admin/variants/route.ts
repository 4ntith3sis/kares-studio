import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/supabase/admin-auth';
import { revalidateStorefront } from '@/lib/revalidate';

/**
 * Kares Studio — Phase 6 admin variants API (server, service role).
 * SATU-SATUNYA sumber variant adalah product_variants. Inventory hanya
 * membaca dari sini — tidak ada tabel/inventory variant terpisah.
 *
 * GET ?product_id=: variants + stock per variant (0 = belum pernah IN).
 * POST { product_id, color_id, size_id }: create (409 bila duplicate).
 * DELETE ?id= [&confirm=1]: two-step seperti hapus produk. Tanpa
 *   confirm dan variant punya transaksi → 409 + jumlah transaksi (tidak
 *   ada yang dihapus). Dengan confirm=1 → hapus transaksi riwayat variant
 *   tersebut lalu hapus variant.
 */
function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get('product_id');
  if (!productId) return bad('product_id is required.');
  try {
    const gate = await requireAdmin();
    if ('response' in gate) return gate.response;
    const supabase = getServiceSupabase();
    const [{ data: variants, error }, { data: stocks }] = await Promise.all([
      supabase
        .from('product_variants')
        .select(
          'id, color:colors(id, name, hex_code), size:sizes(id, name, sort_order)'
        )
        .eq('product_id', productId)
        .order('created_at', { ascending: true }),
      supabase.from('variant_stock').select('variant_id, stock'),
    ]);
    if (error) throw error;
    const byStock = new Map<string, number>(
      (((stocks ?? []) as { variant_id: string; stock: number }[]) ?? []).map(
        (r) => [r.variant_id, r.stock ?? 0]
      )
    );
    type V = {
      id: string;
      color: { id: string; name: string; hex_code: string } | { id: string; name: string; hex_code: string }[] | null;
      size: { id: string; name: string; sort_order: number } | { id: string; name: string; sort_order: number }[] | null;
    };
    const norm = <T,>(v: T | T[] | null): T | null =>
      v === null ? null : Array.isArray(v) ? (v[0] ?? null) : v;
    return NextResponse.json({
      variants: ((((variants ?? []) as unknown as V[]) ?? []).map((v) => ({
        id: v.id,
        color: norm(v.color),
        size: norm(v.size),
        stock: byStock.get(v.id) ?? 0,
      }))),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'List failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: { product_id?: unknown; color_id?: unknown; size_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return bad('Invalid JSON body.');
  }
  if (typeof body.product_id !== 'string' || !body.product_id) {
    return bad('product_id is required.');
  }
  if (typeof body.color_id !== 'string' || !body.color_id) {
    return bad('color_id is required.');
  }
  if (typeof body.size_id !== 'string' || !body.size_id) {
    return bad('size_id is required.');
  }
  try {
    const gate = await requireAdmin();
    if ('response' in gate) return gate.response;
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('product_variants')
      .insert({
        product_id: body.product_id,
        color_id: body.color_id,
        size_id: body.size_id,
      })
      .select('id')
      .single();
    if (error) {
      if ((error as { code?: string }).code === '23505') {
        return NextResponse.json(
          { error: 'Variant (color + size) ini sudah ada untuk produk tersebut.' },
          { status: 409 }
        );
      }
      throw error;
    }
    revalidateStorefront(['/collection', '/', 'product']);
    return NextResponse.json({ variant: data }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Create failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const confirm = searchParams.get('confirm');
  if (!id) return bad('Variant id is required.');
  try {
    const gate = await requireAdmin();
    if ('response' in gate) return gate.response;
    const supabase = getServiceSupabase();
    const { count } = await supabase
      .from('inventory_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('variant_id', id);
    const txCount = count ?? 0;
    // Step 1 (tanpa confirm): laporkan dampak, jangan hapus apa pun bila
    // variant masih punya riwayat transaksi.
    if (txCount > 0 && confirm !== '1') {
      return NextResponse.json(
        {
          error: `Variant memiliki ${txCount} transaksi inventory.`,
          transactions: txCount,
        },
        { status: 409 }
      );
    }
    // Step 2 (confirm=1): hapus riwayat transaksi variant ini dulu, lalu
    // hapus variant.
    if (txCount > 0) {
      const { error: txError } = await supabase
        .from('inventory_transactions')
        .delete()
        .eq('variant_id', id);
      if (txError) throw txError;
    }
    const { error } = await supabase
      .from('product_variants')
      .delete()
      .eq('id', id);
    if (error) throw error;
    revalidateStorefront(['/collection', '/', 'product']);
    return NextResponse.json({ ok: true, deletedTransactions: txCount });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Delete failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
