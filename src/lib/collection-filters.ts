/**
 * Kares Studio — Phase 3 collection filter/sort helpers.
 *
 * Pure functions (no network, no Supabase import) so filtering, search,
 * and sorting run client-side in memory after a single server fetch.
 * This keeps filter interaction instant and avoids repeated queries.
 * Category matching uses the DB slug (never the display label).
 */

export type CollectionSortKey =
  | 'newest'
  | 'name-asc'
  | 'name-desc'
  | 'price-low'
  | 'price-high';

export const COLLECTION_SORT_OPTIONS: {
  value: CollectionSortKey;
  label: string;
}[] = [
  { value: 'newest', label: 'Terbaru' },
  { value: 'name-asc', label: 'Nama A-Z' },
  { value: 'name-desc', label: 'Nama Z-A' },
  { value: 'price-low', label: 'Harga Terendah' },
  { value: 'price-high', label: 'Harga Tertinggi' },
];

/** Minimal product shape this module operates on. */
export interface CollectionFilterProduct {
  name: string;
  slug: string;
  price: number;
  created_at: string;
  categorySlug: string | null;
}

export interface CollectionFilters {
  /** Category DB slug, or '' for all categories. */
  categorySlug: string;
  /** Raw search text (matched case-insensitively against name). */
  search: string;
  /** Inclusive bounds; null means unbounded. */
  minPrice: number | null;
  maxPrice: number | null;
  sort: CollectionSortKey;
}

export const DEFAULT_COLLECTION_SORT: CollectionSortKey = 'newest';

/** newest → created_at DESC, name A-Z/Z-A, price low/high. Unknown → newest. */
export function parseSortParam(value: string | null): CollectionSortKey {
  if (
    value === 'newest' ||
    value === 'name-asc' ||
    value === 'name-desc' ||
    value === 'price-low' ||
    value === 'price-high'
  ) {
    return value;
  }
  return DEFAULT_COLLECTION_SORT;
}

/** Non-negative integer or null (unbounded). Rejects NaN/negative/empty. */
export function parsePriceParam(value: string | null): number | null {
  if (value === null) return null;
  const v = value.trim();
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

/**
 * Apply category + search + price filters (ALL must match), then sort.
 * - Category: exact slug match.
 * - Search: case-insensitive substring on product name.
 * - Price: inclusive min/max.
 */
export function filterAndSortProducts<T extends CollectionFilterProduct>(
  products: T[],
  filters: CollectionFilters
): T[] {
  const q = filters.search.trim().toLowerCase();
  const { categorySlug, minPrice, maxPrice } = filters;

  const filtered = products.filter((p) => {
    if (categorySlug && p.categorySlug !== categorySlug) return false;
    if (q && !p.name.toLowerCase().includes(q)) return false;
    if (minPrice !== null && p.price < minPrice) return false;
    if (maxPrice !== null && p.price > maxPrice) return false;
    return true;
  });

  const sorted = [...filtered];
  switch (filters.sort) {
    case 'name-asc':
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'name-desc':
      sorted.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case 'price-low':
      sorted.sort((a, b) => a.price - b.price);
      break;
    case 'price-high':
      sorted.sort((a, b) => b.price - a.price);
      break;
    case 'newest':
    default:
      sorted.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      break;
  }
  return sorted;
}
