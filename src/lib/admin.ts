/**
 * Kares Studio — shared admin constants/helpers (isomorphic, no secrets).
 * Single source of truth for stock thresholds and status labels.
 */

/** Stock > 0 and <= threshold counts as LOW STOCK. */
export const LOW_STOCK_THRESHOLD = 5;

export type StockStatus = 'in' | 'low' | 'out';

export function stockStatusOf(stock: number): StockStatus {
  if (stock <= 0) return 'out';
  if (stock <= LOW_STOCK_THRESHOLD) return 'low';
  return 'in';
}

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  in: 'IN STOCK',
  low: 'LOW STOCK',
  out: 'OUT OF STOCK',
};

export const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/products', label: 'Product' },
  { href: '/admin/categories', label: 'Category' },
  { href: '/admin/inventory', label: 'Inventory' },
  { href: '/admin/cms', label: 'CMS' },
] as const;
/** True when a PostgREST error means "column does not exist yet"
 * (unknown column in select, or missing column in schema cache). */
export function isMissingColumnError(err: unknown): boolean {
  const code = (err as { code?: unknown })?.code;
  const msg = (err as { message?: unknown })?.message;
  return (
    code === '42703' ||
    code === 'PGRST204' ||
    (typeof msg === 'string' &&
      /could not find the '.+' column.+in the schema cache/i.test(msg))
  );
}
