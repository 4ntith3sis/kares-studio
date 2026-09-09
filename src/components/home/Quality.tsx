import CardImage from './CardImage';
import { cmsImageUrl, cmsText } from '@/services/cms';
import type { HomepageCmsMap } from '@/services/cms';

/** CMS overlay only — markup/styles identical to the final design. */
export default function Quality({ cms = {} }: { cms?: HomepageCmsMap }) {
  const tag = cmsText(cms, 'quality', 'tag', '[QUALITY PROMISE]');
  const quote = cmsText(
    cms,
    'quality',
    'quote',
    '\u201CEvery piece is crafted with intention. From heavy fabric weights to precise shoulder drops, we design essential garments built to last.\u201D'
  );
  const image = cmsImageUrl(cms, 'quality', 'image', 'cms/look-female-side.jpeg');
  return (
    <section id="quality">
      <div className="container-main grid-12" style={{ alignItems: 'center' }}>
        <div className="q-img-col">
          <div className="section-tag" style={{ marginBottom: '.5rem' }}>
            <span className="star">✹</span>
            <span className="label">{tag}</span>
          </div>
          <div className="q-img-wrap">
            <CardImage
              src={image}
              alt="Kares Studio crafted with precision"
            />
            <div className="q-tag">
              <span>[CRAFTED WITH PRECISION]</span>
            </div>
          </div>
        </div>

        <div className="q-text-col">
          <div>
            <span
              style={{
                fontFamily: "'DM Mono',monospace",
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--accent)',
                textTransform: 'uppercase',
                letterSpacing: '.15em',
              }}
            >
              {'// BRAND ESSENCE'}
            </span>
          </div>
          <blockquote>{quote}</blockquote>
          <div className="q-pillars">
            <div>
              <span className="pillar-name">PREMIUM FABRICS</span>
              <span className="pillar-sub">HEAVYWEIGHT &amp; DURABLE</span>
            </div>
            <div>
              <span className="pillar-name">TAILORED CUTS</span>
              <span className="pillar-sub">MODERN SILHOUETTES</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
