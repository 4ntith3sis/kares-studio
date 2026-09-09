import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/home/Footer';

/**
 * Kares Studio — Product Not Found (Phase 4).
 * Rendered by notFound() when a /product/[slug] slug does not exist.
 * Same tokens as other shop states; links back to Collection.
 */
export default function ProductNotFound() {
  return (
    <>
      <Navbar />
      <main className="container-main shop-page">
      <div className="shop-state" role="alert">
        <div className="section-tag" style={{ justifyContent: 'center' }}>
          <span className="star">✹</span>
          <span className="label">[PRODUCT NOT FOUND]</span>
        </div>
        <h2>Produk tidak ditemukan</h2>
        <p>
          Produk yang Anda cari tidak tersedia atau sudah tidak dijual.
          Jelajahi koleksi untuk menemukan produk lainnya.
        </p>
        <div className="shop-state-actions">
          <Link href="/collection" className="btn-primary">
            Back to Collection
          </Link>
          <Link href="/" className="btn-outline">
            Back to Home
          </Link>
        </div>
      </div>
    </main>
      <Footer />
    </>
  );
}
