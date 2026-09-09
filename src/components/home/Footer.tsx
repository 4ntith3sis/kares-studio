import Link from 'next/link';
import { cmsText } from '@/services/cms';
import type { HomepageCmsMap } from '@/services/cms';

/** CMS overlay only — markup/styles identical to the final design. */
export default function Footer({ cms = {} }: { cms?: HomepageCmsMap }) {
  const tagline = cmsText(
    cms,
    'footer',
    'tagline',
    'From editorial design to high-fashion garments, our expert team is here to elevate your style and celebrate every moment.'
  );
  const address = cmsText(
    cms,
    'footer',
    'address',
    '14 Road Street, Jakarta, Indonesia'
  );
  return (
    <footer id="footer">
      <div className="container-main">
        <div className="foot-top">
          <div>
            <Link
              href="/"
              className="foot-brand"
              aria-label="Kares Studio home"
            >
              KARES STUDIO<span>.</span>
            </Link>
            <div className="socials">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Kares Studio Instagram"
              >
                in
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Kares Studio X"
              >
                x
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Kares Studio YouTube"
              >
                yt
              </a>
            </div>
            <div className="foot-address">
              <p>{address}</p>
              <p>info@karesstudio.com</p>
              <p>+62 812 3456 789</p>
            </div>
          </div>

          <div className="foot-links-grid">
            <div className="link-col">
              <span className="col-label">{'//MENU'}</span>
              <ul>
                <li>
                  <Link href="/about">About</Link>
                </li>
                <li>
                  <Link href="/collection">Collection</Link>
                </li>
                <li>
                  <Link href="/collection">Product</Link>
                </li>
                <li>
                  <Link href="/collection">Categories</Link>
                </li>
              </ul>
            </div>
            <div className="link-col">
              <span className="col-label">{'//SHOP'}</span>
              <ul>
                <li>
                  <Link href="/collection?category=outerwear">Jacket</Link>
                </li>
                <li>
                  <Link href="/collection?category=t-shirts">T-Shirts</Link>
                </li>
                <li>
                  <Link href="/collection?category=accessories">Hat</Link>
                </li>
                <li>
                  <Link href="/collection?category=outerwear">Blazer</Link>
                </li>
              </ul>
            </div>
            <div className="link-col">
              <span className="col-label">{'//LAST'}</span>
              <ul>
                <li>
                  <Link href="/about">Blog</Link>
                </li>
                <li>
                  <a
                    href="https://wa.me/6281234567890"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Contact
                  </a>
                </li>
                <li>
                  <Link href="/about">Terms</Link>
                </li>
                <li>
                  <Link href="/about">Service</Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="foot-bottom">
          <p className="foot-tagline">
            {tagline}
          </p>
          <div className="bottom-links">
            <Link href="/about">TERMS &amp; CONDITIONS</Link>
            <Link href="/about">PRIVACY POLICY</Link>
            <Link href="/collection" className="started-btn">
              Get Started
              <svg
                width="13"
                height="13"
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
        </div>
      </div>
    </footer>
  );
}
