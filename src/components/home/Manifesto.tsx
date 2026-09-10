import Link from 'next/link';
import CardImage from './CardImage';
import { cmsImageUrl, cmsText } from '@/services/cms';
import type { HomepageCmsMap } from '@/services/cms';

/** CMS overlay only — markup/styles identical to the final design. */
export default function Manifesto({ cms = {} }: { cms?: HomepageCmsMap }) {
  const heading = cmsText(
    cms,
    'manifesto',
    'heading',
    'At KARES STUDIO, we believe fashion is more than just clothing\u2014it\u2019s an expression of who you are in every moment.'
  );
  // Inline landscape photo card rendered right after the word "just".
  // CMS key `manifesto.swatches/swatch_image` fills it; empty CMS shows the
  // placeholder card (same cut) until a photo is wired.
  const swatchSrc = cmsImageUrl(cms, 'manifesto', 'swatch_image', '');
  const justMatch = heading.match(/\bjust\b/i);
  const justEnd =
    justMatch && justMatch.index !== undefined
      ? justMatch.index + justMatch[0].length
      : -1;
  return (
    <section id="manifesto">
      <div className="container-main mani-inner">
        <div className="section-tag" style={{ marginBottom: '2rem' }}>
          <span className="star">✹</span>
          <span className="label">[OUR PHILOSOPHY]</span>
        </div>

        <h2 className="mani-cms-heading">
          {justEnd === -1 ? (
            heading
          ) : (
            <>
              {heading.slice(0, justEnd)}{' '}
              <span className="swatch" role="img" aria-label="Kares Studio fabric detail">
                <CardImage
                  src={swatchSrc}
                  alt="Kares Studio fabric detail"
                  position="center 20%"
                />
              </span>{' '}
              {heading.slice(justEnd).trimStart()}
            </>
          )}
        </h2>

        <div className="mani-cta">
          <Link href="/about" className="btn-outline">
            LEARN MORE
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
          <span className="about-label">[About Kares Studio]</span>
        </div>
      </div>
    </section>
  );
}
