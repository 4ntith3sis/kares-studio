import Link from 'next/link';
import CardImage from './CardImage';
import { cmsImageUrl, cmsText } from '@/services/cms';
import type { HomepageCmsMap } from '@/services/cms';

/** CMS overlay only — markup/styles identical to the final design. */
export default function Hero({ cms = {} }: { cms?: HomepageCmsMap }) {
  const eyebrow = cmsText(cms, 'hero', 'eyebrow', '//STYLED FOR LIFE.');
  const headingLines = cmsText(cms, 'hero', 'heading', 'where lives|style now').split('|');
  const description = cmsText(
    cms,
    'hero',
    'description',
    'Explore curated collections, exclusive drops and everyday essentials all thoughtfully designed in one stylish shopping destination.'
  );
  const buttonText = cmsText(cms, 'hero', 'button_text', 'Shop Collection');
  const heroImage = cmsImageUrl(cms, 'hero', 'image', 'cms/look-female-front.jpeg');
  const tagline = cmsText(
    cms,
    'hero',
    'tagline',
    'Step into effortless elegance with Kares Studio'
  );
  return (
    <section id="hero">
      <div className="container-main">
        <div className="hero-grid">
          {/* Left */}
          <div className="hero-left">
            <div className="hero-top-label anim-hero-1">
              <div className="left-tag">
                <span style={{ color: 'var(--accent)', fontSize: '1rem' }}>✹</span>
                <span
                  style={{
                    fontFamily: "'DM Mono',monospace",
                    fontSize: 11,
                    letterSpacing: '.2em',
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                  }}
                >
                  {eyebrow}
                </span>
              </div>
              <span
                style={{
                  fontFamily: "'DM Mono',monospace",
                  fontSize: 11,
                  letterSpacing: '.2em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                }}
              >
                [01/08]
              </span>
            </div>

            <div style={{ margin: 'auto 0' }}>
              <div className="anim-hero-2">
                <h1>
                  {headingLines[0] ?? 'where lives'}
                  <br />
                  {headingLines[1] ?? 'style now'}
                </h1>
              </div>
              <div className="hero-meta anim-hero-3">
                <div>
                  <span className="mono-label">{'//FASHION'}</span>
                  <p>{description}</p>
                </div>
                <div className="badge-wrap">
                  <span
                    style={{
                      fontFamily: "'DM Mono',monospace",
                      fontSize: 10,
                      letterSpacing: '.2em',
                      textTransform: 'uppercase',
                      color: 'var(--muted)',
                    }}
                  >
                    /Collection 2026
                  </span>
                  <span className="badge">[NEW ARRIVALS]</span>
                </div>
              </div>
            </div>

            <div className="hero-cta anim-hero-4">
              <Link href="/collection" className="btn-primary">
                {buttonText}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="7" y1="17" x2="17" y2="7" />
                  <polyline points="7 7 17 7 17 17" />
                </svg>
              </Link>
              <span className="cta-meta">[SS26 / COLLECTION]</span>
            </div>
          </div>

          {/* Right */}
          <div className="hero-right anim-hero-img">
            <div className="img-labels">
              <span>[FEATURED LOOK]</span>
              <span>[SCROLL DOWN]</span>
            </div>

            <div className="hero-img-wrap">
              <CardImage
                src={heroImage}
                alt="Kares Studio featured look"
                eager
              />

              <div className="drop-tag">
                <span>DROP 01</span>
                <small>KARES STUDIO</small>
              </div>

              <Link
                href="/collection"
                className="arrow-badge"
                aria-label="Shop Kares Studio collection"
              >
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
              </Link>
            </div>

            <div className="hero-foot">
              <span className="copy">©KARES STUDIO</span>
              <span className="tagline">
                {tagline}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
