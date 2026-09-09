import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/home/Footer';
import CartPageClient from '@/components/cart/CartPageClient';

/**
 * Kares Studio — Phase 5 Cart page (server shell + client body).
 * Items/qty/summary/checkout live in CartPageClient (localStorage cart
 * + fresh variant_stock validation). No new DB tables.
 */
export default function CartPage() {
  return (
    <>
      <Navbar />
      <main className="container-main shop-page">
        <div className="shop-header">
          <div className="section-tag">
            <span className="star">✹</span>
            <span className="label">[CART]</span>
          </div>
          <h1>Cart</h1>
          <p>
            Periksa pesanan Anda — atur quantity, isi data, lalu checkout
            via WhatsApp.
          </p>
        </div>
        <CartPageClient />
        <p className="cart-back">
          <Link href="/collection">← Lanjut belanja</Link>
        </p>
      </main>
      <Footer />
    </>
  );
}
