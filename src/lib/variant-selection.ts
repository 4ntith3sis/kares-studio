import type { ProductDetailVariant } from '@/services/products';

/**
 * Kares Studio — Phase 4 variant selection helpers.
 *
 * Pure functions over the PDP variant matrix. Stock is always per
 * (product_id, color_id, size_id) combination — never a global product
 * stock. A missing combination means "no such variant" (unavailable),
 * distinct from stock === 0 (Sold Out).
 */

export interface VariantSelection {
  colorId: string | null;
  sizeId: string | null;
}

export function getColorsOf(
  variants: ProductDetailVariant[]
): { id: string; name: string; hex_code: string }[] {
  const byId = new Map<string, { id: string; name: string; hex_code: string }>();
  for (const v of variants) {
    if (!byId.has(v.color.id)) byId.set(v.color.id, { ...v.color });
  }
  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function getSizesOf(
  variants: ProductDetailVariant[]
): { id: string; name: string; sort_order: number }[] {
  const byId = new Map<string, { id: string; name: string; sort_order: number }>();
  for (const v of variants) {
    if (!byId.has(v.size.id)) byId.set(v.size.id, { ...v.size });
  }
  return Array.from(byId.values()).sort((a, b) => a.sort_order - b.sort_order);
}

/** Exact variant for a color+size pair, or null when no such variant. */
export function findVariant(
  variants: ProductDetailVariant[],
  sel: VariantSelection
): ProductDetailVariant | null {
  if (!sel.colorId || !sel.sizeId) return null;
  return (
    variants.find(
      (v) => v.color.id === sel.colorId && v.size.id === sel.sizeId
    ) ?? null
  );
}

/** Size ids that have NO variant at all for the given color. */
export function unavailableSizeIdsFor(
  variants: ProductDetailVariant[],
  colorId: string | null
): Set<string> {
  const allSizes = getSizesOf(variants).map((s) => s.id);
  if (!colorId) return new Set();
  const hasVariant = new Set(
    variants.filter((v) => v.color.id === colorId).map((v) => v.size.id)
  );
  return new Set(allSizes.filter((id) => !hasVariant.has(id)));
}

/** Color ids that have NO variant at all for the given size. */
export function unavailableColorIdsFor(
  variants: ProductDetailVariant[],
  sizeId: string | null
): Set<string> {
  const allColors = getColorsOf(variants).map((c) => c.id);
  if (!sizeId) return new Set();
  const hasVariant = new Set(
    variants.filter((v) => v.size.id === sizeId).map((v) => v.color.id)
  );
  return new Set(allColors.filter((id) => !hasVariant.has(id)));
}

export type AddToCartReadiness =
  | { ok: false; reason: 'color' | 'size' | 'unavailable' | 'soldout' }
  | { ok: true; variant: ProductDetailVariant };

/** Validate selection before Add to Cart. */
export function checkAddToCart(
  variants: ProductDetailVariant[],
  sel: VariantSelection
): AddToCartReadiness {
  if (!sel.colorId) return { ok: false, reason: 'color' };
  if (!sel.sizeId) return { ok: false, reason: 'size' };
  const variant = findVariant(variants, sel);
  if (!variant) return { ok: false, reason: 'unavailable' };
  if (variant.stock <= 0) return { ok: false, reason: 'soldout' };
  return { ok: true, variant };
}
