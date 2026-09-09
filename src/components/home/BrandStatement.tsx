import Link from 'next/link';
import CardImage from './CardImage';
import { cmsText } from '@/services/cms';
import type { HomepageCmsMap } from '@/services/cms';

/** CMS overlay only — markup/styles identical to the final design. */
export default function BrandStatement({ cms = {} }: { cms?: HomepageCmsMap }) {
  const heading = cmsText(cms, 'brand_statement', 'heading', 'All — about moments ©26');
  const rightLabel = cmsText(
    cms,
    'brand_statement',
    'right_label',
    'WHERE ELEGANCE MEETS SUSTAINABILITY'
  );
  const badge = cmsText(cms, 'brand_statement', 'badge', 'LUXURY MADE ACCESSIBLE');
  const quote = cmsText(
    cms,
    'brand_statement',
    'quote',
    '\u201CEvery piece carries rhythm beyond clothing, it\u2019s motion and meaning where street energy meets.\u201D'
  );
  return (
    <section id="brand-statement">
      <div className="container-main">
        <div className="stmt-header">
          <div>
            <div className="section-tag" style={{ marginBottom: '.75rem' }}>
              <span className="star">✹</span>
              <span className="label">[STATEMENT // 2026]</span>
            </div>
            <h2>{heading}</h2>
          </div>
          <div className="stmt-right">
            <span
              style={{
                fontFamily: "'DM Mono',monospace",
                fontSize: 10,
                letterSpacing: '.2em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}
            >
              {rightLabel}
            </span>
            <span
              style={{
                fontFamily: "'DM Mono',monospace",
                fontSize: 12,
                textTransform: 'uppercase',
                border: '1px solid rgba(216,213,207,.6)',
                padding: '.25rem .75rem',
                borderRadius: 9999,
              }}
            >
              {badge}
            </span>
          </div>
        </div>

        <div className="grid-12" style={{ alignItems: 'center' }}>
          <div className="img-left-col">
            <div className="img-left-inner">
              <div className="shape-left">
                <CardImage
                  src="/images/look-male-triple.jpeg"
                  alt="Kares Studio campaign 2026"
                  position="center 20%"
                />
                <div className="pill">
                  <span>[01/CAMPAIGN →]</span>
                </div>
                <div className="arrow-badge">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="7" y1="17" x2="17" y2="7" />
                    <polyline points="7 7 17 7 17 17" />
                  </svg>
                </div>
              </div>
              <div className="left-caption">
                <p className="c">©KARES STUDIO / CAMPAIGN 2026</p>
                <span className="ess">[ESSENTIAL RELEASE]</span>
                <span
                  style={{
                    fontFamily: "'DM Mono',monospace",
                    fontSize: 9,
                    letterSpacing: '.15em',
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                    display: 'block',
                    marginTop: '.25rem',
                  }}
                >
                  CURATED STREETWEAR CUTS
                </span>
              </div>
            </div>
          </div>

          <div className="img-right-col">
            <div className="shape-right">
              <CardImage
                src="/images/look-female-side.jpeg"
                alt="Kares Studio lookbook jacket 2026"
              />
            </div>
            <div className="right-caption">
              <p className="c">©KARES STUDIO - JACKET 2026</p>
              <p className="q">{quote}</p>
              <Link href="/collection" aria-label="View Kares Studio lookbook" style={{ display: 'none' }}>
                Lookbook
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
