import Link from 'next/link';
import CardImage from '@/components/home/CardImage';
import { formatIDR } from '@/lib/utils/format';
import type { RelatedProduct } from '@/services/products';

/**
 * Kares Studio — PDP "You May Also Like" (server).
 * Reuses the homepage product card language (.prod-card/.prod-img)
 * and links to /product/[slug] with DB slugs. Hidden when empty.
 */
export default function RelatedProducts({
  products,
}: {
  products: RelatedProduct[];
}) {
  if (products.length === 0) return null;

  return (
    <section className="pdp-related" aria-label="You may also like">
      <div className="section-tag">
        <span className="star">✹</span>
        <span className="label">[YOU MAY ALSO LIKE]</span>
      </div>
      <h2>You May Also Like</h2>
      <div className="shop-grid pdp-related-grid">
        {products.map((p) => (
          <Link
            href={`/product/${p.slug}`}
            className="prod-card shop-card"
            key={p.slug || p.id}
            aria-label={`View ${p.name}`}
          >
            <div className="prod-img">
              {p.imageSrc ? (
                <CardImage src={p.imageSrc} alt={`Kares Studio ${p.name}`} />
              ) : (
                <div className="ph">[PRODUCT]</div>
              )}
            </div>
            <div className="prod-info">
              <p className="prod-name">{p.name}</p>
              <p className="prod-price">{formatIDR(p.price)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
