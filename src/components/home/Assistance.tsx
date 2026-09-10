'use client';

import Link from 'next/link';
import { useState } from 'react';
import CardImage from './CardImage';
import { resolveImageUrlPublic } from '@/lib/images';
import { cmsImage, cmsText } from '@/services/cms';
import type { HomepageCmsMap } from '@/services/cms';

const COLLECTIONS = [
  { name: '@Everyday Essentials', year: '2025', icon: 'sun' },
  { name: '@Statement Pieces', year: '2025', icon: 'star' },
  { name: '@Timeless Classics', year: '2024', icon: 'clock' },
  { name: '@Seasonal Collections', year: '2024', icon: 'globe' },
] as const;

function CollectionIcon({ icon }: { icon: string }) {
  if (icon === 'star') {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    );
  }
  if (icon === 'clock') {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4l3 3" />
      </svg>
    );
  }
  if (icon === 'globe') {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
        <path d="M12 6v6l4 2" />
      </svg>
    );
  }
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
    </svg>
  );
}

export default function Assistance({
  cms,
  cmsReady = false,
}: {
  cms?: HomepageCmsMap;
  cmsReady?: boolean;
}) {
  const [active, setActive] = useState(2);
  const map: HomepageCmsMap = cms ?? {};
  // Text overlay only when CMS has rows; static design copy otherwise.
  const tag = cmsReady
    ? cmsText(map, 'assistance', 'tag', '[07 // CUSTOMER ASSISTANCE]')
    : '[07 // CUSTOMER ASSISTANCE]';
  const desc = cmsReady
    ? cmsText(
        map,
        'assistance',
        'description',
        'Your go-to wardrobe staples, crafted for comfort and effortless style.'
      )
    : 'Your go-to wardrobe staples, crafted for comfort and effortless style.';
  const cta = cmsReady
    ? cmsText(map, 'assistance', 'button_text', 'GET STARTED')
    : 'GET STARTED';
  // CMS-managed photos (client-safe resolver; static Storage paths as fallback).
  const img1 = resolveImageUrlPublic(
    cmsImage(map, 'assistance', 'image_1', 'static/assistance/look-male-coat.jpeg'),
    process.env.NEXT_PUBLIC_SUPABASE_URL
  );
  const img2 = resolveImageUrlPublic(
    cmsImage(map, 'assistance', 'image_2', 'static/assistance/look-female-front.jpeg'),
    process.env.NEXT_PUBLIC_SUPABASE_URL
  );

  return (
    <section id="assistance">
      <div className="container-main">
        <div className="asst-topbar">
          <div className="left-tag">
            <span style={{ color: 'var(--accent)' }}>✹</span>
            <span>{tag}</span>
          </div>
          <span>©KARES STUDIO / DIRECT INQUIRIES</span>
        </div>

        <div className="grid-12" style={{ alignItems: 'center' }}>
          <div className="asst-img-col">
            <div className="asst-img-duo">
              <div className="asst-photo-col left">
                <div className="asst-img-wrap offset-top">
                  <CardImage
                    src={img1}
                    alt="Kares Studio look 01"
                    position="center 20%"
                  />
                </div>
                <div className="asst-label-below">
                  <span className="moment-mark" aria-hidden="true">✳</span>
                  <span className="handle">[Wear the Moment]</span>
                </div>
              </div>

              <div className="asst-photo-col right">
                <div className="asst-label-above">
                  <span>From timeless classics to bold statement pieces, our collections are thoughtfully.</span>
                </div>
                <div className="asst-img-wrap offset-bottom">
                  <CardImage
                    src={img2}
                    alt="Kares Studio look 02"
                    position="center 20%"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="asst-text-col">
            <div className="coll-list">
              {COLLECTIONS.slice(0, 3).map((c, i) => (
                <div
                  key={c.name}
                  className={`coll-item${active === i ? ' active' : ''}`}
                  onClick={() => setActive(i)}
                >
                  <div className="coll-item-left">
                    <div className="coll-icon-wrap">
                      <CollectionIcon icon={c.icon} />
                    </div>
                    <span className="coll-name">{c.name}</span>
                  </div>
                  <div className="coll-item-left" style={{ gap: '.75rem' }}>
                    <span className="coll-year">{c.year}</span>
                    <div className="coll-arrow-btn">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="7" y1="17" x2="17" y2="7" />
                        <polyline points="7 7 17 7 17 17" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}

              <div className="coll-cta-row">
                <span className="coll-cta-desc">
                  {desc}
                </span>
                <Link href="/collection" className="coll-get-started">
                  {cta}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </Link>
              </div>

              {COLLECTIONS.slice(3).map((c, i) => {
                const idx = i + 3;
                return (
                  <div
                    key={c.name}
                    className={`coll-item${active === idx ? ' active' : ''}`}
                    onClick={() => setActive(idx)}
                  >
                    <div className="coll-item-left">
                      <div className="coll-icon-wrap">
                        <CollectionIcon icon={c.icon} />
                      </div>
                      <span className="coll-name">{c.name}</span>
                    </div>
                    <div className="coll-item-left" style={{ gap: '.75rem' }}>
                      <span className="coll-year">{c.year}</span>
                      <div className="coll-arrow-btn">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="7" y1="17" x2="17" y2="7" />
                          <polyline points="7 7 17 7 17 17" />
                        </svg>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
