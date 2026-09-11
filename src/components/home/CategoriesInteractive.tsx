'use client';

import { useState } from 'react';
import CardImage from './CardImage';
import type { HomepageCategory } from '@/services/homepage';

type Props = {
  categories: HomepageCategory[];
};

/**
 * Interactive Categories shell (client): hover updates the corner label
 * and preview image, exactly like the original homepage design.
 * Data comes from props (Supabase via server section).
 */
export default function CategoriesInteractive({ categories }: Props) {
  const [activeNum, setActiveNum] = useState<string>(
    categories[0]?.num ?? '01'
  );

  if (categories.length === 0) {
    return (
      <div className="grid-12" style={{ alignItems: 'center' }}>
        <div className="cat-list-col">
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            Categories are being curated — check back soon.
          </p>
        </div>
      </div>
    );
  }

  const active =
    categories.find((c) => c.num === activeNum) ?? categories[0];

  return (
    <div className="grid-12" style={{ alignItems: 'center' }}>
      <div className="cat-list-col">
        <div className="section-tag" style={{ marginBottom: '1.5rem' }} data-reveal>
          <span className="star">✹</span>
          <span className="label">[CATEGORIES]</span>
        </div>
        <div id="cat-list">
          {categories.map((cat, i) => (
            <div
              key={cat.slug || cat.id}
              className="cat-item"
              data-reveal
              data-delay={String(Math.min(i, 3) * 80)}
              onMouseEnter={() => setActiveNum(cat.num)}
            >
              <div className="cat-item-row">
                <div className="cat-name-group">
                  <span className="cat-num">[{cat.num}]</span>
                  <span className="cat-name">{cat.name}</span>
                </div>
                <span className="cat-arrow">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="7" y1="17" x2="17" y2="7" />
                    <polyline points="7 7 17 7 17 17" />
                  </svg>
                </span>
              </div>
              <div className="cat-desc">
                {cat.description ? <p>{cat.description}</p> : null}
                <a href={`/collection?category=${cat.slug}`}>
                  [ SEE PRODUCT &rarr; ]
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="cat-img-col">
        <div className="cat-img-wrap" data-image-reveal>
          {active?.imageSrc ? (
            <CardImage
              key={active.slug || active.id}
              src={active.imageSrc}
              alt={`Kares Studio ${active.name}`}
            />
          ) : (
            <div className="cat-img-ph">[CATEGORY IMAGE]</div>
          )}
          <div className="cat-corner-tag">
            <span id="cat-corner-label">
              ©KARES STUDIO // CATEGORY // {active?.num ?? '01'}
            </span>
          </div>
          <div className="cat-dot">✹</div>
        </div>
      </div>
    </div>
  );
}
