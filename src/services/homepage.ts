import { getSupabase } from '@/lib/supabase/query';
import { isMissingColumnError } from '@/lib/admin';
import { resolveImageUrl } from '@/lib/images';
import type { Category, Product } from '@/types';

/** Homepage category row: DB fields + renderable image URL. */
export type HomepageCategory = Category & {
  /** Hover/selection number, 2-digit string ("01", "02", ...). */
  num: string;
  /** Resolved image URL or null when category has no image. */
  imageSrc: string | null;
};

/** Homepage featured product card: DB fields + primary image + category. */
export type HomepageFeaturedProduct = Pick<
  Product,
  'id' | 'name' | 'slug' | 'price' | 'featured'
> & {
  categoryName: string | null;
  /** Primary image URL (lowest sort_order) or null when product has no image. */
  imageSrc: string | null;
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Homepage-only display order by category slug. Categories not in this
 * list keep their relative order after the four main ones.
 */
const HOMEPAGE_CATEGORY_ORDER = [
  'outerwear',
  'tops',
  'bottoms',
  'accessories',
];

/**
 * Categories for the homepage section, ordered by the editorial
 * slug sequence above (stable — same every render).
 * Errors are thrown to the caller; the section boundary converts them
 * into a safe fallback (never a raw DB error, never a crash).
 */
export async function getHomepageCategories(): Promise<HomepageCategory[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, description, image_url, created_at, updated_at')
    .order('created_at', { ascending: true });
  if (error) throw error;

  const rank = (slug: string): number => {
    const i = HOMEPAGE_CATEGORY_ORDER.indexOf(slug);
    return i === -1 ? HOMEPAGE_CATEGORY_ORDER.length : i;
  };
  const sorted = ((data ?? []) as Category[]).sort(
    (a, b) => rank(a.slug) - rank(b.slug)
  );
  return sorted.map((c, i) => ({
    ...c,
    num: pad2(i + 1),
    imageSrc: resolveImageUrl(c.image_url),
  }));
}

/**
 * Featured collection for the homepage: ACTIVE products with
 * featured = true plus their primary image (lowest sort_order) and
 * category name. Single products query + single images query (no N+1).
 * Falls back gracefully when the Phase 6 `is_active` column has not
 * been migrated yet (treats all products as active).
 */
export async function getHomepageFeaturedProducts(): Promise<HomepageFeaturedProduct[]> {
  const supabase = getSupabase();

  // Prefer active-only; retry without the Phase 6 column when the
  // migration has not been applied yet (PostgREST 42703).
  let products: unknown[] | null = null;
  const withActive = await supabase
    .from('products')
    .select('id, name, slug, price, featured, is_active, category:categories(name)')
    .eq('featured', true)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (!withActive.error) {
    products = withActive.data as unknown[] | null;
  } else if (isMissingColumnError(withActive.error)) {
    const legacy = await supabase
      .from('products')
      .select('id, name, slug, price, featured, category:categories(name)')
      .eq('featured', true)
      .order('created_at', { ascending: false });
    if (legacy.error) throw legacy.error;
    products = legacy.data as unknown[] | null;
  } else {
    throw withActive.error;
  }

  type ProductRow = Pick<
    Product,
    'id' | 'name' | 'slug' | 'price' | 'featured'
  > & { category: { name: string } | { name: string }[] | null };
  const normCategory = (
    c: ProductRow['category']
  ): { name: string } | null => {
    if (!c) return null;
    return Array.isArray(c) ? (c[0] ?? null) : c;
  };

  const list = ((products ?? []) as unknown as ProductRow[]);
  if (list.length === 0) return [];

  const ids = list.map((p) => p.id);
  const { data: images, error: imgError } = await supabase
    .from('product_images')
    .select('product_id, image_url, sort_order')
    .in('product_id', ids)
    .order('sort_order', { ascending: true });
  if (imgError) throw imgError;

  const primaryByProduct = new Map<string, string>();
  for (const img of (images ?? []) as {
    product_id: string;
    image_url: string | null;
    sort_order: number;
  }[]) {
    if (!primaryByProduct.has(img.product_id) && img.image_url) {
      primaryByProduct.set(img.product_id, img.image_url);
    }
  }

  return list.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    featured: p.featured,
    categoryName: normCategory(p.category)?.name ?? null,
    imageSrc: resolveImageUrl(primaryByProduct.get(p.id) ?? null),
  }));
}
