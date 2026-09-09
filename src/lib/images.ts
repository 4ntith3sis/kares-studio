import { getSupabase } from '@/lib/supabase/query';

/** Storage bucket holding all product photos. */
export const PRODUCT_IMAGES_BUCKET = 'product-images';

/**
 * Public URL for a product image stored in the `product-images` bucket.
 *
 * `value` is the object path / file name as stored in
 * `product_images.image_url` (e.g. `basic-oversized-t-shirt-1.jpg`) —
 * never the bucket name, never a full URL. Built with
 * `supabase.storage.from('product-images').getPublicUrl(...)`; pure
 * string operation, no network call. Returns null when unresolvable
 * (caller must render a safe fallback, never a broken image).
 */
export function resolveImageUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  if (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('/')) {
    return v;
  }

  const path = v.startsWith(`${PRODUCT_IMAGES_BUCKET}/`)
    ? v.slice(PRODUCT_IMAGES_BUCKET.length + 1)
    : v;
  if (!path) return null;
  try {
    const { data } = getSupabase()
      .storage.from(PRODUCT_IMAGES_BUCKET)
      .getPublicUrl(path);
    return data?.publicUrl ?? null;
  } catch {
    return null;
  }
}

/**
 * Client-safe variant of resolveImageUrl (no Supabase client needed).
 * Builds the public URL by string concatenation — same result as
 * getPublicUrl for public buckets. Use in client components.
 */
export function resolveImageUrlPublic(
  value: string | null | undefined,
  supabaseUrl?: string
): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  if (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('/')) {
    return v;
  }
  const path = v.startsWith(`${PRODUCT_IMAGES_BUCKET}/`)
    ? v.slice(PRODUCT_IMAGES_BUCKET.length + 1)
    : v;
  if (!path) return null;
  const base = (supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
  if (!base) return null;
  return `${base}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/${path}`;
}
