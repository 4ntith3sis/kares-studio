/**
 * Convert a product/category name into a URL slug.
 * Rules: lowercase, hyphen-separated, unique, strip unneeded characters.
 *
 * Basic Oversized T-Shirt → basic-oversized-t-shirt
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '-') // non-alphanumerics → hyphen
    .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
    .replace(/-{2,}/g, '-') // collapse repeats
    .slice(0, 120);
}

/**
 * Client-side helper to preview the next unique slug given existing slugs.
 * The DATABASE trigger is the real authority (see migration 0001) — this is
 * only for admin UI previews in Phase 2.
 */
export function nextUniqueSlug(base: string, taken: Set<string> | string[]): string {
  const used = Array.isArray(taken) ? new Set(taken) : taken;
  const root = slugify(base) || 'product';
  if (!used.has(root)) return root;
  let i = 2;
  while (used.has(`${root}-${i}`)) i += 1;
  return `${root}-${i}`;
}
