'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import CardImage from './CardImage';
import ProductHoverGallery from './ProductHoverGallery';
import { formatIDR } from '@/lib/utils/format';
import { cmsText } from '@/services/cms';
import type { HomepageCmsMap } from '@/services/cms';
import type { HomepageFeaturedProduct } from '@/services/homepage';

type Props = {
  products: HomepageFeaturedProduct[];
  cms?: HomepageCmsMap;
};

/**
 * Featured Collection carousel (client): horizontal scroll + progress bar.
 * Markup/styles identical to the original homepage design — only the
 * data source changed (props from Supabase via server section).
 * Cards link to /product/[slug] using the DB slug.
 */
export default function FeaturedCarousel({ products, cms = {} }: Props) {
  const tag = cmsText(cms, 'featured', 'tag', '[NEW DROP]');
  const heading = cmsText(cms, 'featured', 'heading', 'New Arrivals');
  const sub = cmsText(cms, 'featured', 'sub', '[NEW RELEASE DROP]');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    const bar = progressRef.current;
    if (!el || !bar) return;

    const updateProgress = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      const max = scrollWidth - clientWidth;
      const pct = max > 0 ? (scrollLeft / max) * 100 : 0;
      bar.style.width = Math.max(15, pct) + '%';
    };

    updateProgress();
    el.addEventListener('scroll', updateProgress);
    return () => el.removeEventListener('scroll', updateProgress);
  }, []);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.75, behavior: 'smooth' });
  };

  return (
    <section id="featured">
      <div className="container-main">
        <div className="feat-header" data-reveal>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '3rem', flexWrap: 'wrap', minWidth: 0 }}>
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '.5rem',
                  marginBottom: '.5rem',
                }}
              >
                <span style={{ color: 'var(--accent)' }}>✹</span>
                <span
                  style={{
                    fontFamily: "'DM Mono',monospace",
                    fontSize: 11,
                    letterSpacing: '.2em',
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                  }}
                >
                  {tag}
                </span>
              </div>
              <h2>{heading}</h2>
            </div>
            <span
              style={{
                fontFamily: "'DM Mono',monospace",
                fontSize: 12,
                color: 'var(--muted)',
                marginTop: '2.5rem',
              }}
            >
              ©2026
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1.5rem',
              flexWrap: 'wrap',
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontFamily: "'DM Mono',monospace",
                fontSize: 11,
                color: 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '.12em',
              }}
            >
              {sub}
            </span>
            <div className="feat-nav-btns">
              <button onClick={() => scrollBy(-1)} aria-label="Scroll left">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
              </button>
              <button onClick={() => scrollBy(1)} aria-label="Scroll right">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="feat-scroll-track">
        <div className="feat-scroll" ref={scrollRef}>
          {products.length === 0 ? (
            <p
              style={{
                color: 'var(--muted)',
                fontSize: 13,
                padding: '2rem 0',
              }}
            >
              New arrivals are being curated — check back soon.
            </p>
          ) : (
            products.map((p) => {
              const gallery =
                p.gallery.length > 0
                  ? p.gallery
                  : p.imageSrc
                    ? [p.imageSrc]
                    : [];
              return (
              <Link
                href={`/product/${p.slug}`}
                className="prod-card"
                key={p.slug || p.id}
                aria-label={`View ${p.name}`}
              >
                <div className="prod-img">
                  {gallery.length > 1 ? (
                    <ProductHoverGallery
                      images={gallery}
                      alt={`Kares Studio ${p.name}`}
                    />
                  ) : gallery.length === 1 ? (
                    <CardImage
                      src={gallery[0]}
                      alt={`Kares Studio ${p.name}`}
                    />
                  ) : (
                    <div className="ph">[PRODUCT]</div>
                  )}
                </div>
                <div className="prod-info">
                  <p className="prod-name">{p.name}</p>
                  <p className="prod-price">{formatIDR(p.price)}</p>
                </div>
              </Link>
              );
            })
          )}

          <div className="view-all-card">
            <Link href="/collection" aria-label="View Kares Studio collection">
              <span className="explore-lbl">Explore All</span>
              <span className="view-lbl">View Collection</span>
              <svg
                className="view-arrow"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <line x1="7" y1="17" x2="17" y2="7" />
                <polyline points="7 7 17 7 17 17" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      <div className="container-main feat-footer">
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" ref={progressRef} />
        </div>
        <Link href="/collection">
          See All Releases
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <line x1="7" y1="17" x2="17" y2="7" />
            <polyline points="7 7 17 7 17 17" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
