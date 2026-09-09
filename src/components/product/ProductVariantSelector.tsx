'use client';

import { useMemo, useState } from 'react';
import { formatIDR } from '@/lib/utils/format';
import {
  checkAddToCart,
  findVariant,
  getColorsOf,
  getSizesOf,
  unavailableColorIdsFor,
  unavailableSizeIdsFor,
} from '@/lib/variant-selection';
import { useCart } from '@/components/cart/CartStore';
import type { ProductDetail } from '@/services/products';

/**
 * Kares Studio — Phase 4 variant selector (client).
 *
 * Color swatches (hex_code circles) + size buttons + per-variant stock
 * (TOTAL IN − TOTAL OUT, never global) + validated Add to Cart.
 * Sizes with no variant for the chosen color are disabled; stock 0
 * renders Sold Out and blocks Add to Cart. Feedback is inline text;
 * no navigation, no Cart Page (Phase 5).
 */
export default function ProductVariantSelector({
  product,
}: {
  product: ProductDetail;
}) {
  const { addItem, lastAddedAt } = useCart();
  const [colorId, setColorId] = useState<string | null>(null);
  const [sizeId, setSizeId] = useState<string | null>(null);
  const [addedKey, setAddedKey] = useState<string | null>(null);

  const colors = useMemo(
    () => getColorsOf(product.variants),
    [product.variants]
  );
  const sizes = useMemo(() => getSizesOf(product.variants), [product.variants]);
  const unavailableSizes = useMemo(
    () => unavailableSizeIdsFor(product.variants, colorId),
    [product.variants, colorId]
  );
  const unavailableColors = useMemo(
    () => unavailableColorIdsFor(product.variants, sizeId),
    [product.variants, sizeId]
  );
  const activeVariant = useMemo(
    () => findVariant(product.variants, { colorId, sizeId }),
    [product.variants, colorId, sizeId]
  );
  const readiness = useMemo(
    () => checkAddToCart(product.variants, { colorId, sizeId }),
    [product.variants, colorId, sizeId]
  );

  const selectedColor = colors.find((c) => c.id === colorId) ?? null;
  const selectedSize = sizes.find((s) => s.id === sizeId) ?? null;

  const showHint = !readiness.ok && (colorId !== null || sizeId !== null);
  const hintText = !readiness.ok
    ? readiness.reason === 'color' && sizeId
      ? 'Pilih warna terlebih dahulu.'
      : readiness.reason === 'size' && colorId
        ? 'Pilih ukuran terlebih dahulu.'
        : readiness.reason === 'unavailable'
          ? 'Variant tidak tersedia'
          : readiness.reason === 'soldout'
            ? 'Sold Out'
            : null
    : null;

  const handleSelectColor = (id: string) => {
    setColorId(id);
    // Drop the size when the new color has no variant for it, so the
    // displayed stock/variant never belongs to the previous color.
    setSizeId((prev) =>
      prev !== null &&
      product.variants.some((v) => v.color.id === id && v.size.id === prev)
        ? prev
        : null
    );
    setAddedKey(null);
  };

  const handleSelectSize = (id: string) => {
    setSizeId(id);
    // Drop the color when the new size has no variant for it, so the
    // displayed stock/variant never belongs to the previous size.
    setColorId((prev) =>
      prev !== null &&
      product.variants.some((v) => v.size.id === id && v.color.id === prev)
        ? prev
        : null
    );
    setAddedKey(null);
  };

  const handleAdd = () => {
    if (!readiness.ok) return;
    const v = readiness.variant;
    addItem({
      variantId: v.id,
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      price: product.price,
      imageSrc: product.primaryImageSrc,
      colorId: v.color.id,
      colorName: v.color.name,
      colorHex: v.color.hex_code,
      sizeId: v.size.id,
      sizeName: v.size.name,
    });
    setAddedKey(`${v.id}:${lastAddedAt ?? Date.now()}`);
  };

  if (product.variants.length === 0) {
    return (
      <p className="pdp-stock pdp-stock-empty" role="status">
        Varian belum tersedia untuk produk ini.
      </p>
    );
  }

  return (
    <div className="pdp-selectors">
      <div className="pdp-opt-group">
        <p className="pdp-opt-label" id="pdp-color-label">
          <span>Color</span>
          {selectedColor ? (
            <strong>{selectedColor.name}</strong>
          ) : (
            <em>Pilih warna</em>
          )}
        </p>
        <div
          className="pdp-swatches"
          role="radiogroup"
          aria-labelledby="pdp-color-label"
        >
          {colors.map((c) => {
            const selected = c.id === colorId;
            const unavailable = unavailableColors.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`Color ${c.name}${unavailable ? ' (unavailable)' : ''}`}
                title={c.name}
                disabled={unavailable}
                className={`pdp-swatch${selected ? ' active' : ''}${unavailable ? ' unavailable' : ''}`}
                style={{ backgroundColor: c.hex_code }}
                onClick={() => handleSelectColor(c.id)}
              />
            );
          })}
        </div>
      </div>

      <div className="pdp-opt-group">
        <p className="pdp-opt-label" id="pdp-size-label">
          <span>Size</span>
          {selectedSize ? (
            <strong>{selectedSize.name}</strong>
          ) : (
            <em>Pilih ukuran</em>
          )}
        </p>
        <div
          className="pdp-sizes"
          role="radiogroup"
          aria-labelledby="pdp-size-label"
        >
          {sizes.map((s) => {
            const unavailable = unavailableSizes.has(s.id);
            const selected = s.id === sizeId;
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`Size ${s.name}${unavailable ? ' (unavailable)' : ''}`}
                disabled={unavailable}
                className={`pdp-size${selected ? ' active' : ''}${unavailable ? ' unavailable' : ''}`}
                onClick={() => handleSelectSize(s.id)}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      </div>

      <p
        className={`pdp-stock${activeVariant && activeVariant.stock <= 0 ? ' pdp-stock-out' : ''}`}
        role="status"
        aria-live="polite"
      >
        {activeVariant
          ? activeVariant.stock > 0
            ? `Stock: ${activeVariant.stock}`
            : 'Sold Out'
          : colorId && sizeId
            ? 'Variant tidak tersedia'
            : 'Pilih warna dan ukuran untuk melihat stok'}
      </p>

      <div className="pdp-buy-row">
        <button
          type="button"
          className="btn-primary pdp-add-btn"
          onClick={handleAdd}
          disabled={!readiness.ok}
          aria-disabled={!readiness.ok}
        >
          Add to Cart —{' '}
          {formatIDR(product.price)}
        </button>
      </div>
      {showHint && hintText ? (
        <p className="pdp-hint" role="alert">
          {hintText}
        </p>
      ) : null}
      {addedKey && readiness.ok ? (
        <p className="pdp-added" role="status">
          Ditambahkan ke cart ✓
        </p>
      ) : null}
    </div>
  );
}
