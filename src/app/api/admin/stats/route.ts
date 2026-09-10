import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/supabase/admin-auth';
import { resolveImageUrl } from '@/lib/images';
import { isMissingColumnError } from '@/lib/admin';

/**
 * Kares Studio — Phase 6 admin dashboard stats (server).
 * GET → totals + recent/low/out products from REAL Supabase data.
 * Service role is used server-side only; never exposed to the browser.
 */
export async function GET() {
  try {
    const gate = await requireAdmin();
    if ('response' in gate) return gate.response;
    const supabase = getServiceSupabase();

    // Tolerant of a DB without the Phase 6 is_active column: select it
    // when present, otherwise treat every product as active.
    let products: unknown[] | null = null;
    let hasActiveCol = true;
    const withActive = await supabase
      .from('products')
      .select('id, name, slug, price, featured, is_active, created_at')
      .order('created_at', { ascending: false });
    if (!withActive.error) {
      products = withActive.data;
    } else if (isMissingColumnError(withActive.error)) {
      hasActiveCol = false;
      const legacy = await supabase
        .from('products')
        .select('id, name, slug, price, featured, created_at')
        .order('created_at', { ascending: false });
      if (legacy.error) throw legacy.error;
      products = legacy.data;
    } else {
      throw withActive.error;
    }

    const [catRes, varRes, stockRes, imgRes] = await Promise.all([
      supabase.from('categories').select('id, name'),
      supabase
        .from('product_variants')
        .select(
          'id, product_id, product:products(id, name, slug, price, category:categories(name)), color:colors(name), size:sizes(name, sort_order)'
        ),
      supabase.from('variant_stock').select('variant_id, stock'),
      supabase
        .from('product_images')
        .select('product_id, image_url, sort_order')
        .order('sort_order', { ascending: true }),
    ]);
    const { data: categories } = catRes;
    const { data: variants } = varRes;
    const { data: stocks } = stockRes;
    // Foto utama per produk (sort_order terkecil = utama).
    const firstImageByProduct = new Map<string, string>();
    for (const img of ((imgRes.data ?? []) as {
      product_id: string;
      image_url: string;
    }[])) {
      if (!firstImageByProduct.has(img.product_id)) {
        firstImageByProduct.set(img.product_id, img.image_url);
      }
    }

    type P = {
      id: string;
      name: string;
      slug: string;
      price: number;
      featured: boolean;
      is_active?: boolean;
      created_at: string;
    };
    const prods = (((products ?? []) as unknown as P[]) ?? []).map((p) => ({
      ...p,
      is_active: hasActiveCol ? (p.is_active ?? true) : true,
    }));
    const stockByVariant = new Map<string, number>(
      (((stocks ?? []) as { variant_id: string; stock: number }[]) ?? []).map(
        (r) => [r.variant_id, r.stock ?? 0]
      )
    );

    type V = {
      id: string;
      product_id: string;
      product:
        | {
            id: string;
            name: string;
            slug: string;
            price: number;
            category: { name: string } | { name: string }[] | null;
          }
        | {
            id: string;
            name: string;
            slug: string;
            price: number;
            category: { name: string } | { name: string }[] | null;
          }[]
        | null;
      color: { name: string } | { name: string }[] | null;
      size: { name: string; sort_order: number } | { name: string; sort_order: number }[] | null;
    };
    const norm = <T,>(v: T | T[] | null): T | null =>
      v === null ? null : Array.isArray(v) ? (v[0] ?? null) : v;
    const varRows = (((variants ?? []) as unknown as V[]) ?? []).map((v) => {
      const prod = norm(v.product);
      return {
        id: v.id,
        product_id: v.product_id,
        product: prod
          ? { id: prod.id, name: prod.name, slug: prod.slug, price: prod.price }
          : null,
        categoryName: norm(prod?.category ?? null)?.name ?? '—',
        colorName: norm(v.color)?.name ?? '—',
        sizeName: norm(v.size)?.name ?? '—',
        stock: stockByVariant.get(v.id) ?? 0,
        imageUrl: resolveImageUrl(firstImageByProduct.get(v.product_id) ?? null),
      };
    });

    const active = prods.filter((p) => p.is_active);
    const stockByProduct = new Map<string, number>();
    for (const v of varRows) {
      stockByProduct.set(
        v.product_id,
        (stockByProduct.get(v.product_id) ?? 0) + v.stock
      );
    }
    const availableProducts = prods.filter(
      (p) => (stockByProduct.get(p.id) ?? 0) > 0
    ).length;
    return NextResponse.json({
      stats: {
        totalProducts: prods.length,
        activeProducts: active.length,
        inactiveProducts: prods.length - active.length,
        availableProducts,
        emptyProducts: prods.length - availableProducts,
        totalCategories: (categories ?? []).length,
        totalVariants: varRows.length,
        totalStock: varRows.reduce((n, v) => n + v.stock, 0),
        lowStock: varRows.filter((v) => v.stock > 0 && v.stock <= 5).length,
        outOfStock: varRows.filter((v) => v.stock <= 0).length,
      },
      recentProducts: prods.slice(0, 5),
      lowStockProducts: varRows
        .filter((v) => v.stock > 0 && v.stock <= 5)
        .slice(0, 8),
      outOfStockProducts: varRows
        .filter((v) => v.stock <= 0)
        .slice(0, 8),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Dashboard failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
