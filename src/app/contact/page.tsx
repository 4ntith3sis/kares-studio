import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/home/Footer';
import CardImage from '@/components/home/CardImage';
import { cmsImageUrl, getHomepageContent } from '@/services/cms';
import type { HomepageCmsMap } from '@/services/cms';

/**
 * Kares Studio — Contact page.
 * Editorial layout reusing homepage + cart tokens. WhatsApp number is
 * read from the same NEXT_PUBLIC_WHATSAPP_NUMBER env used by checkout;
 * falls back to the documented number when unconfigured.
 */
const STORE_WA =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, '') ||
  '6281234567890';

const CHANNELS = [
  {
    label: 'WHATSAPP',
    value: '+62 812 3456 789',
    href: `https://wa.me/${STORE_WA}?text=${encodeURIComponent('Halo Kares Studio, saya ingin bertanya tentang koleksi Anda.')}`,
    desc: 'Respons tercepat untuk pertanyaan produk & pesanan.',
  },
  {
    label: 'EMAIL',
    value: 'info@karesstudio.com',
    href: 'mailto:info@karesstudio.com',
    desc: 'Untuk kolaborasi, press, dan pertanyaan umum.',
  },
  {
    label: 'INSTAGRAM',
    value: '@kares.studio',
    href: 'https://instagram.com',
    desc: 'Lookbook terbaru dan update drop.',
  },
];

export default async function ContactPage() {
  let cms: HomepageCmsMap = {};
  try {
    cms = await getHomepageContent();
  } catch {
    cms = {};
  }
  const image = cmsImageUrl(cms, 'contact', 'image', 'static/contact/look-female-front.jpeg');
  return (
    <>
      <Navbar />
      <main className="container-main shop-page">
        <div className="shop-header">
          <div className="section-tag">
            <span className="star">✹</span>
            <span className="label">[CONTACT // KARES STUDIO]</span>
          </div>
          <h1>Contact</h1>
          <p>
            Ada pertanyaan tentang koleksi, sizing, atau pesanan? Hubungi
            kami melalui kanal berikut.
          </p>
        </div>

        <div className="grid-12 contact-layout" style={{ alignItems: 'start' }}>
          <div className="contact-img-col">
            <div className="contact-img-wrap">
              <CardImage
                src={image}
                alt="Kares Studio contact"
              />
              <div className="cat-corner-tag">
                <span>©KARES STUDIO // JKT</span>
              </div>
            </div>
            <p className="filter-hint" style={{ marginTop: '1rem' }}>
              14 ROAD STREET, JAKARTA, INDONESIA
            </p>
          </div>

          <div className="contact-list-col">
            <div className="coll-list">
              {CHANNELS.map((c) => (
                <a
                  key={c.label}
                  className="coll-item"
                  href={c.href}
                  target={c.href.startsWith('http') ? '_blank' : undefined}
                  rel={
                    c.href.startsWith('http')
                      ? 'noopener noreferrer'
                      : undefined
                  }
                >
                  <span className="coll-item-left">
                    <span className="coll-name">{c.label}</span>
                  </span>
                  <span className="coll-year">{c.value}</span>
                </a>
              ))}
            </div>
            <div className="ed-testimonial" style={{ marginTop: '2rem' }}>
              <p className="ed-quote">
                Jam operasional: Senin – Sabtu, 09.00 – 18.00 WIB. Pesan via
                WhatsApp di luar jam operasional akan dibalas pada hari kerja
                berikutnya.
              </p>
              <div className="ed-reviewer">
                <div>
                  <span className="ed-reviewer-name">KARES STUDIO</span>
                  <span className="ed-reviewer-tag">CUSTOMER CARE</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
