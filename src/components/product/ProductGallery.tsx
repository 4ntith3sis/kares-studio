'use client';

import { useState } from 'react';
import CardImage from '@/components/home/CardImage';
import type { ProductDetail } from '@/services/products';

/**
 * Kares Studio — Phase 4 product gallery (client).
 *
 * Main image (aspect 3/4, object-fit cover, same clipped-card language
 * as the homepage) + thumbnail strip ordered by sort_order. Clicking a
 * thumbnail swaps the main image. Safe with 0/1/N images: empty gallery
 * renders the placeholder, a single image hides the strip.
 */
export default function ProductGallery({
  product,
}: {
  product: ProductDetail;
}) {
  const [activeId, setActiveId] = useState<string | null>(
    product.gallery[0]?.id ?? null
  );
  const active =
    product.gallery.find((g) => g.id === activeId) ?? product.gallery[0];

  return (
    <div className="pdp-gallery pdp-gallery-enter">
      <div className="pdp-main-img">
        {active?.imageSrc ? (
          <CardImage
            key={active.id}
            src={active.imageSrc}
            alt={`Kares Studio ${product.name}`}
            eager
          />
        ) : (
          <div className="ph">[PRODUCT]</div>
        )}
      </div>
      {product.gallery.length > 1 ? (
        <div className="pdp-thumbs" aria-label="Product images">
          {product.gallery.map((g, i) => (
            <button
              key={g.id}
              type="button"
              className={`pdp-thumb${g.id === active?.id ? ' active' : ''}`}
              onClick={() => setActiveId(g.id)}
              aria-label={`View image ${i + 1} of ${product.name}`}
              aria-pressed={g.id === active?.id}
            >
              {g.imageSrc ? (
                <CardImage
                  src={g.imageSrc}
                  alt=""
                  placeholderBackground="var(--card)"
                />
              ) : (
                <div className="ph">[IMG]</div>
              )}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
