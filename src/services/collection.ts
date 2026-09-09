import { getSupabase } from '@/lib/supabase/query';
import { isMissingColumnError } from '@/lib/admin';
import { resolveImageUrl } from '@/lib/images';
import type { Category } from '@/types';
import type { CollectionFilterProduct } from '@/lib/collection-filters';

/**
 * Kares Studio — Phase 3 collection data layer (server only).
 *
 * Single page-load fetch: one products query + one product_images query
 * + one categories query (no N+1). Filtering, search, and sorting run
 * client-side in memory over this payload, so interacting with filters
 * never triggers another Supabase request.
 *
 * Category matching downstream uses the category DB slug.
 * Primary image = lowest sort_order (same rule as homepage Phase 2).
 */
export interface CollectionProduct extends CollectionFilterProduct {
  id: string;
  categoryName: string | null;
  /** Primary image URL or null when the product has no image. */
  imageSrc: string | null;
}

export interface CollectionData {
  products: CollectionProduct[];
  categories: Category[];
}

export async function getCollectionData(): Promise<CollectionData> {
  const supabase = getSupabase();

  // Active-only when the Phase 6 column exists; tolerant retry when not.
  const loadProducts = async () => {
    const withActive = await supabase
      .from('products')
      .select(
        'id, name, slug, price, created_at, is_active, category:categories(id, name, slug)'
      )
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (!withActive.error) return withActive.data;
    if (isMissingColumnError(withActive.error)) {
      const legacy = await supabase
        .from('products')
        .select(
          'id, name, slug, price, created_at, category:categories(id, name, slug)'
        )
        .order('created_at', { ascending: false });
      if (legacy.error) throw legacy.error;
      return legacy.data;
    }
    throw withActive.error;
  };

  const [{ data: categories, error: catError }, products] =
    await Promise.all([
      supabase.from('categories').select('*').order('name', { ascending: true }),
      loadProducts(),
    ]);
  if (catError) throw catError;

  type ProductRow = {
    id: string;
    name: string;
    slug: string;
    price: number;
    created_at: string;
    category:
      | { id: string; name: string; slug: string }
      | { id: string; name: string; slug: string }[]
      | null;
  };
  const rows = ((products ?? []) as unknown as ProductRow[]);
  const cats = ((categories ?? []) as Category[]);

  let primaryByProduct = new Map<string, string>();
  if (rows.length > 0) {
    const { data: images, error: imgError } = await supabase
      .from('product_images')
      .select('product_id, image_url, sort_order')
      .in(
        'product_id',
        rows.map((p) => p.id)
      )
      .order('sort_order', { ascending: true });
    if (imgError) throw imgError;
    for (const img of (images ?? []) as {
      product_id: string;
      image_url: string | null;
      sort_order: number;
    }[]) {
      if (!primaryByProduct.has(img.product_id) && img.image_url) {
        primaryByProduct.set(img.product_id, img.image_url);
      }
    }
  }

  const normCategory = (
    c: ProductRow['category']
  ): { id: string; name: string; slug: string } | null => {
    if (!c) return null;
    return Array.isArray(c) ? (c[0] ?? null) : c;
  };

  return {
    categories: cats,
    products: rows.map((p) => {
      const cat = normCategory(p.category);
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        created_at: p.created_at,
        categorySlug: cat?.slug ?? null,
        categoryName: cat?.name ?? null,
        imageSrc: resolveImageUrl(primaryByProduct.get(p.id) ?? null),
      };
    }),
  };
}
