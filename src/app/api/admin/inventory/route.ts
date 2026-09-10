import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/supabase/admin-auth';
import { revalidateStorefront } from '@/lib/revalidate';

/**
 * Kares Studio — Phase 6 admin inventory API (server, service role).
 * GET: variant matrix — ONLY variants whose product still exists.
 *   PostgREST has no named `product` relationship for `!inner` here,
 *   so we use the explicit `product:products(...)` nest plus a server
 *   null-filter. DB FK (product_id → products.id, no orphan possible)
 *   is the real guarantee; the filter is belt and suspenders.
 *   Stock-0 / never-stocked / inactive-product variants are still
 *   listed (valid variants); only true orphans are excluded.
 * POST { variant_id, type: 'in'|'out', quantity, note? }:
 *   inserts inventory_transactions. DB trigger guard_inventory_stock
 *   rejects OUT beyond stock (never bypassed). Quantity must be int > 0.
 */
function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get('product_id');
  try {
    const gate = await requireAdmin();
    if ('response' in gate) return gate.response;
    const supabase = getServiceSupabase();
    type V = {
      id: string;
      product: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null;
      color: { id: string; name: string; hex_code: string } | { id: string; name: string; hex_code: string }[] | null;
      size: { id: string; name: string; sort_order: number } | { id: string; name: string; sort_order: number }[] | null;
    };
    const norm = <T,>(v: T | T[] | null): T | null =>
      v === null ? null : Array.isArray(v) ? (v[0] ?? null) : v;

    // ?history=1 → semua catatan penambahan/pengurangan + note, terbaru dulu.
    if (searchParams.get('history') === '1') {
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select(
          'id, type, quantity, note, created_at, variant:product_variants(product:products(name), color:colors(name), size:sizes(name))'
        )
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      type H = {
        id: string;
        type: string;
        quantity: number;
        note: string | null;
        created_at: string;
        variant: {
          product: { name: string } | { name: string }[] | null;
          color: { name: string } | { name: string }[] | null;
          size: { name: string } | { name: string }[] | null;
        } | {
          product: { name: string } | { name: string }[] | null;
          color: { name: string } | { name: string }[] | null;
          size: { name: string } | { name: string }[] | null;
        }[] | null;
      };
      return NextResponse.json({
        history: (((data ?? []) as unknown as H[]) ?? []).map((h) => {
          const v = norm(h.variant);
          return {
            id: h.id,
            type: h.type,
            quantity: h.quantity,
            note: h.note,
            created_at: h.created_at,
            productName: norm(v?.product ?? null)?.name ?? '—',
            variantLabel: `${norm(v?.color ?? null)?.name ?? '?'} / ${norm(v?.size ?? null)?.name ?? '?'}`,
          };
        }),
      });
    }
    let q = supabase
      .from('product_variants')
      .select(
        'id, product:products(id, name, slug), color:colors(id, name, hex_code), size:sizes(id, name, sort_order)'
      )
      .order('created_at', { ascending: true });
    if (productId) q = q.eq('product_id', productId);
    const [{ data: variants, error }, { data: stocks }] = await Promise.all([
      q,
      supabase.from('variant_stock').select('variant_id, total_in, total_out, stock'),
    ]);
    if (error) throw error;

    const byStock = new Map<string, { total_in: number; total_out: number; stock: number }>(
      (((stocks ?? []) as { variant_id: string; total_in: number; total_out: number; stock: number }[]) ?? []).map(
        (r) => [r.variant_id, { total_in: r.total_in ?? 0, total_out: r.total_out ?? 0, stock: r.stock ?? 0 }]
      )
    );
    return NextResponse.json({
      rows: ((((variants ?? []) as unknown as V[]) ?? [])
        // Exclude true orphans (no parent product). FK normally makes
        // this impossible; the filter guarantees the UI never shows
        // "Unknown/Deleted Product" rows regardless.
        .filter((v) => norm(v.product) !== null)
        .map((v) => ({
          id: v.id,
          product: norm(v.product),
          color: norm(v.color),
          size: norm(v.size),
          ...(byStock.get(v.id) ?? { total_in: 0, total_out: 0, stock: 0 }),
        }))),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'List failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: { variant_id?: unknown; type?: unknown; quantity?: unknown; note?: unknown };
  try {
    body = await req.json();
  } catch {
    return bad('Invalid JSON body.');
  }
  if (typeof body.variant_id !== 'string' || !body.variant_id) {
    return bad('variant_id is required.');
  }
  if (body.type !== 'in' && body.type !== 'out') {
    return bad('type must be "in" or "out".');
  }
  const quantity = Number(body.quantity);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return bad('quantity must be an integer > 0.');
  }
  const note =
    typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null;

  try {
    const gate = await requireAdmin();
    if ('response' in gate) return gate.response;
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('inventory_transactions')
      .insert({
        variant_id: body.variant_id,
        type: body.type,
        quantity,
        note,
      })
      .select('id, variant_id, type, quantity, created_at')
      .single();
    if (error) throw error;
    revalidateStorefront(['/collection', '/', 'product']);
    return NextResponse.json({ transaction: data }, { status: 201 });
  } catch (err) {
    const raw =
      typeof (err as { message?: unknown })?.message === 'string' &&
      (err as { message: string }).message
        ? (err as { message: string }).message
        : String(err);
    // DB guard raises P0001 on insufficient stock — surface as 422.
    const status = /insufficient stock/i.test(raw) ? 422 : 500;
    return NextResponse.json({ error: raw }, { status });
  }
}
