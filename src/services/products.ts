import { getSupabase } from '@/lib/supabase/query';
import { isMissingColumnError } from '@/lib/admin';
import { resolveImageUrl } from '@/lib/images';
import type {
  Color,
  Product,
  ProductImage,
  ProductWithRelations,
  Size,
} from '@/types';
import { getProductVariants } from './variants';

async function attachVariants(
  supabase: ReturnType<typeof getSupabase>,
  productId: string
) {
  const { data: stockRows, error: stockError } = await supabase
    .from('variant_stock')
    .select('variant_id, total_in, total_out, stock');
  if (stockError) throw stockError;

  const stockByVariant = new Map(
    (stockRows as { variant_id: string; total_in: number; total_out: number; stock: number }[]).map(
      (r) => [r.variant_id, r]
    )
  );
  const variants = await getProductVariants(productId);
  return { variants, stockByVariant };
}

/** All products, newest first. */
export async function getProducts(): Promise<Product[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Product[];
}

/** Products flagged for the homepage Featured Collection. */
export async function getFeaturedProducts(): Promise<Product[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('featured', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Product[];
}

/**
 * Inactive products are hidden from the storefront: PDP returns null
 * (→ 404) and related/listing queries exclude them. Tolerant of a DB
 * that has not applied the Phase 6 `is_active` migration yet.
 */
function isActiveRow(row: { is_active?: unknown }): boolean {
  if (!('is_active' in row)) return true;
  return row.is_active !== false;
}

export async function getProductBySlug(slug: string): Promise<ProductWithRelations | null> {
  const supabase = getSupabase();
  const { data: product, error } = await supabase
    .from('products')
    .select('*, category:categories(*), images:product_images(*)')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  if (!product) return null;
  if (!isActiveRow(product as { is_active?: unknown })) return null;

  const images = ([...((product as { images: ProductImage[] }).images ?? [])] as ProductImage[]).sort(
    (a, b) => a.sort_order - b.sort_order
  );

  const { variants, stockByVariant } = await attachVariants(supabase, product.id as string);
  const variantsWithStock = variants.map((v) => ({
    ...v,
    total_in: stockByVariant.get(v.id)?.total_in ?? 0,
    total_out: stockByVariant.get(v.id)?.total_out ?? 0,
    stock: stockByVariant.get(v.id)?.stock ?? 0,
  }));

  return {
    ...(product as Product),
    category: (product as { category: ProductWithRelations['category'] }).category ?? null,
    images,
    variants: variantsWithStock,
  } as ProductWithRelations;
}

/** Gallery images for a product, ordered by sort_order. */
export async function getProductImages(productId: string): Promise<ProductImage[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('product_images')
    .select('*')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data as ProductImage[];
}

/** Related product card for the PDP "You May Also Like" section. */
export interface RelatedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  /** Primary image URL (lowest sort_order) or null. */
  imageSrc: string | null;
}

/**
 * Other products for "You May Also Like": excludes the current slug,
 * shuffled server-side (Fisher–Yates), capped at `limit`.
 * 2 queries total regardless of product count (no N+1); image_url
 * resolved via getPublicUrl('product-images').
 */
export async function getRelatedProducts(
  excludeSlug: string,
  limit = 4
): Promise<RelatedProduct[]> {
  const supabase = getSupabase();
  // Two static queries (the supabase-js builder types the select string
  // literally, so no dynamic-string helper here).
  const withActive = await supabase
    .from('products')
    .select('id, name, slug, price, is_active')
    .neq('slug', excludeSlug);

  type Row = Pick<Product, 'id' | 'name' | 'slug' | 'price'> & {
    is_active?: boolean;
  };
  let rows: Row[];
  if (!withActive.error) {
    rows = ((withActive.data ?? []) as unknown as Row[]).filter(
      (p) => !('is_active' in p) || p.is_active !== false
    );
  } else if (isMissingColumnError(withActive.error)) {
    // Phase 6 column not migrated yet — legacy select without it.
    const legacy = await supabase
      .from('products')
      .select('id, name, slug, price')
      .neq('slug', excludeSlug);
    if (legacy.error) throw legacy.error;
    rows = (legacy.data ?? []) as unknown as Row[];
  } else {
    throw withActive.error;
  }
  return pickRelated(supabase, rows, limit);
}

async function pickRelated(
  supabase: ReturnType<typeof getSupabase>,
  pool: Pick<Product, 'id' | 'name' | 'slug' | 'price'>[],
  limit: number
): Promise<RelatedProduct[]> {
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const picked = pool.slice(0, Math.max(0, limit));
  if (picked.length === 0) return [];

  const { data: images, error: imgError } = await supabase
    .from('product_images')
    .select('product_id, image_url, sort_order')
    .in(
      'product_id',
      picked.map((p) => p.id)
    )
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

  return picked.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    imageSrc: resolveImageUrl(primaryByProduct.get(p.id) ?? null),
  }));
}

/**
 * Phase 4 product detail payload (server only).
 *
 * Reuses getProductBySlug (single nested products query + variants/stock,
 * no N+1): product fields + category + gallery images ordered by
 * sort_order ASC. image_url values are object paths/file names resolved
 * via getPublicUrl('product-images'); null-safe fallbacks included.
 * Throws on query failure (caller renders the error state); returns null
 * only when the slug does not exist.
 */
export interface ProductDetailImage {
  id: string;
  sortOrder: number;
  /** Renderable public URL or null when missing/unresolvable. */
  imageSrc: string | null;
}

export interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  material: string | null;
  price: number;
  featured: boolean;
  categoryName: string | null;
  categorySlug: string | null;
  gallery: ProductDetailImage[];
  /** Primary image (lowest sort_order) or null when product has no image. */
  primaryImageSrc: string | null;
  /**
   * Variant matrix for color/size selection. Stock is per
   * (product_id, color_id, size_id) combination: TOTAL IN − TOTAL OUT
   * via the `variant_stock` view. Never a global product stock.
   */
  variants: ProductDetailVariant[];
}

/** Selectable variant row: joined color/size + derived stock. */
export interface ProductDetailVariant {
  id: string;
  color: Pick<Color, 'id' | 'name' | 'hex_code'>;
  size: Pick<Size, 'id' | 'name' | 'sort_order'>;
  stock: number;
}

export async function getProductDetail(
  slug: string
): Promise<ProductDetail | null> {
  const product = await getProductBySlug(slug);
  if (!product) return null;

  const gallery = product.images.map((img) => ({
    id: img.id,
    sortOrder: img.sort_order,
    imageSrc: resolveImageUrl(img.image_url),
  }));
  const sizeOrder = new Map(product.variants.map((v) => [v.size.id, v.size.sort_order]));
  const variants = product.variants
    .map((v) => ({
      id: v.id,
      color: { id: v.color.id, name: v.color.name, hex_code: v.color.hex_code },
      size: { id: v.size.id, name: v.size.name, sort_order: v.size.sort_order },
      stock: v.stock,
    }))
    .sort(
      (a, b) =>
        (sizeOrder.get(a.size.id) ?? 0) - (sizeOrder.get(b.size.id) ?? 0) ||
        a.color.name.localeCompare(b.color.name)
    );
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    material: product.material,
    price: product.price,
    featured: product.featured,
    categoryName: product.category?.name ?? null,
    categorySlug: product.category?.slug ?? null,
    gallery,
    primaryImageSrc: gallery[0]?.imageSrc ?? null,
    variants,
  };
}
