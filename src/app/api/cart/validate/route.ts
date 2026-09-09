import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/query';

/**
 * Kares Studio — Phase 5 cart stock validation (server).
 *
 * POST { items: [{ variantId, quantity }] } →
 * { stocks: Record<variantId, stock>, issues: [...] }
 *
 * Reads fresh TOTAL IN − TOTAL OUT from the `variant_stock` view with
 * the public key (same read policy as the storefront). Never trusts
 * browser-cached stock. No service role, no writes, no new tables.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const rawItems = (body as { items?: unknown })?.items;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return NextResponse.json({ error: 'Cart is empty.' }, { status: 400 });
  }

  type ReqItem = { variantId: unknown; quantity: unknown };
  const cleaned = (rawItems as ReqItem[])
    .filter(
      (i) =>
        typeof i?.variantId === 'string' &&
        typeof i?.quantity === 'number' &&
        (i.quantity as number) > 0
    )
    .map((i) => ({
      variantId: i.variantId as string,
      quantity: Math.floor(i.quantity as number),
    }));
  if (cleaned.length === 0) {
    return NextResponse.json({ error: 'No valid cart items.' }, { status: 400 });
  }

  const ids = Array.from(new Set(cleaned.map((i) => i.variantId)));
  let stockById = new Map<string, number>();
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('variant_stock')
      .select('variant_id, stock')
      .in('variant_id', ids);
    if (error) throw error;
    stockById = new Map(
      ((data ?? []) as { variant_id: string; stock: number }[]).map((r) => [
        r.variant_id,
        r.stock ?? 0,
      ])
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Stock lookup failed.';
    return NextResponse.json(
      { error: `Tidak dapat memvalidasi stok: ${message}` },
      { status: 502 }
    );
  }

  const stocks: Record<string, number> = {};
  const issues: {
    variantId: string;
    available: number;
    requested: number;
    kind: 'soldout' | 'exceeds' | 'missing';
  }[] = [];
  for (const item of cleaned) {
    if (!stockById.has(item.variantId)) {
      stocks[item.variantId] = 0;
      issues.push({
        variantId: item.variantId,
        available: 0,
        requested: item.quantity,
        kind: 'missing',
      });
    } else {
      const available = stockById.get(item.variantId) ?? 0;
      stocks[item.variantId] = available;
      if (available <= 0) {
        issues.push({
          variantId: item.variantId,
          available,
          requested: item.quantity,
          kind: 'soldout',
        });
      } else if (item.quantity > available) {
        issues.push({
          variantId: item.variantId,
          available,
          requested: item.quantity,
          kind: 'exceeds',
        });
      }
    }
  }

  return NextResponse.json({ stocks, issues });
}
