import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/home/Footer';
import CardImage from '@/components/home/CardImage';
import ScrollReveal from '@/components/home/ScrollReveal';
import { cmsImageUrl } from '@/services/cms';
import { getHomepageContent } from '@/services/cms';
import type { HomepageCmsMap } from '@/services/cms';

const PILLARS = [
  {
    name: 'PREMIUM FABRICS',
    sub: 'HEAVYWEIGHT & DURABLE',
    desc: 'Heavyweight cotton, ripstop twill, dan canvas water-resistant — dipilih untuk ketahanan dan kenyamanan harian.',
  },
  {
    name: 'TAILORED CUTS',
    sub: 'MODERN SILHOUETTES',
    desc: 'Potongan oversized, cargo modern, dan layering jacket dengan shoulder drop yang presisi.',
  },
  {
    name: 'TIMELESS DESIGN',
    sub: 'BEYOND SEASONS',
    desc: 'Siluet esensial yang tidak lekang oleh tren — mudah dipadukan untuk setiap momen.',
  },
];

/**
 * Kares Studio — About page.
 * Editorial layout reusing homepage tokens. Photo is CMS-managed
 * (about.image) with a static Storage fallback — layout unchanged.
 */
export default async function AboutPage() {
  let cms: HomepageCmsMap = {};
  try {
    cms = await getHomepageContent();
  } catch {
    cms = {};
  }
  const image = cmsImageUrl(cms, 'about', 'image', 'static/about/look-male-triple.jpeg');
  return (
    <>
      <Navbar />
      <main className="container-main shop-page">
        <div className="shop-header" data-reveal>
          <div className="section-tag">
            <span className="star">✹</span>
            <span className="label">[ABOUT // KARES STUDIO]</span>
          </div>
          <h1>About Kares Studio</h1>
          <p>
            Essential streetwear dari Jakarta — dirancang untuk momen
            sehari-hari, dibuat untuk bertahan lama.
          </p>
        </div>

        <div className="grid-12 about-story" style={{ alignItems: 'center' }}>
          <div className="about-img-col">
            <div className="about-img-wrap" data-image-reveal>
              <CardImage
                src={image}
                alt="Kares Studio campaign 2026"
                position="center 20%"
              />
              <div className="cat-corner-tag">
                <span>©KARES STUDIO // EST. JKT</span>
              </div>
              <div className="cat-dot">✹</div>
            </div>
          </div>
          <div className="about-text-col" data-reveal data-delay="120">
            <span className="ed-eyebrow">{"// OUR STORY"}</span>
            <h2>
              Fashion is more than clothing — <span className="it">it&rsquo;s expression.</span>
            </h2>
            <p>
              Kares Studio lahir dari keyakinan bahwa pakaian esensial tidak
              harus membosankan. Setiap potongan dirancang dengan intention:
              fabric berbobot, jahitan presisi, dan siluet modern yang bekerja
              untuk layering maupun statement tunggal.
            </p>
            <p>
              Dari heavyweight tee hingga utility jacket, koleksi kami
              mengedepankan street energy yang dipadukan dengan ketelitian
              tailoring — luxury made accessible.
            </p>
          </div>
        </div>

        <section className="about-pillars" aria-label="Brand pillars">
          <div className="section-tag" style={{ marginBottom: '2rem' }}>
            <span className="star">✹</span>
            <span className="label">[WHAT WE STAND FOR]</span>
          </div>
          <div className="about-pillar-grid pillar-stagger">
            {PILLARS.map((p, i) => (
              <div key={p.name} className="about-pillar">
                <span className="pillar-num">[0{i + 1}]</span>
                <span className="pillar-name">{p.name}</span>
                <span className="pillar-sub">{p.sub}</span>
                <p>{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="shop-state-actions" style={{ marginBottom: '2rem' }}>
          <Link href="/collection" className="btn-primary">
            Explore Collection
          </Link>
          <Link href="/contact" className="btn-outline">
            Contact Us
          </Link>
        </div>
      </main>
      <Footer />
      <ScrollReveal />
    </>
  );
}
