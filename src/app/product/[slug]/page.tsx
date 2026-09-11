import Link from 'next/link';
import { notFound } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/home/Footer';
import ProductGallery from '@/components/product/ProductGallery';
import ProductVariantSelector from '@/components/product/ProductVariantSelector';
import RelatedProducts from '@/components/product/RelatedProducts';
import ScrollReveal from '@/components/home/ScrollReveal';
import { formatIDR } from '@/lib/utils/format';
import { getProductDetail, getRelatedProducts } from '@/services/products';

/**
 * Kares Studio — Phase 4 Product Detail page (server).
 *
 * Real Supabase data via getProductDetail (products + category +
 * product_images ordered by sort_order, images resolved through the
 * `product-images` bucket public URL). Gallery interaction lives in
 * ProductGallery; info panel reuses homepage tokens only.
 * Unknown slug → notFound(). Query failure → safe error state.
 */
export default async function ProductDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  let product;
  try {
    product = await getProductDetail(params.slug);
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      const e = err as { message?: string; code?: string };
      console.error('[product] getProductDetail failed:', {
        slug: params.slug,
        message: e?.message ?? String(err),
        code: e?.code,
      });
    }
    return (
      <>
        <Navbar />
        <main className="container-main shop-page">
          <div className="shop-state" role="alert">
            <div className="section-tag" style={{ justifyContent: 'center' }}>
              <span className="star">✹</span>
              <span className="label">[PRODUCT UNAVAILABLE]</span>
            </div>
            <h2>Gagal memuat produk</h2>
            <p>
              Terjadi masalah saat mengambil data produk. Periksa koneksi
              lalu coba lagi.
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

  if (!product) notFound();

  let related: Awaited<ReturnType<typeof getRelatedProducts>> = [];
  try {
    related = await getRelatedProducts(product.slug, 4);
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[product] getRelatedProducts failed:', err);
    }
    related = [];
  }

  return (
    <>
      <Navbar />
      <main className="container-main shop-page">
        <div className="pdp-topbar">
          <Link href="/collection" className="btn-outline" aria-label="Back to collection">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back
          </Link>
        </div>
        <nav className="pdp-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href="/collection">Collection</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{product.name}</span>
        </nav>

        <div className="pdp-layout">
          <ProductGallery product={product} />

          <div className="pdp-info pdp-enter">
            <div className="section-tag">
              <span className="star">✹</span>
              <span className="label">
                [{product.categoryName?.toUpperCase() ?? 'KARES STUDIO'}]
              </span>
            </div>
            <h1>{product.name}</h1>
            <p className="pdp-price">{formatIDR(product.price)}</p>
            {product.description ? (
              <p className="pdp-desc">{product.description}</p>
            ) : null}
            {product.material ? (
              <p className="pdp-meta">
                <span>Material</span>
                {product.material}
              </p>
            ) : null}
            {product.categoryName ? (
              <p className="pdp-meta">
                <span>Category</span>
                {product.categorySlug ? (
                  <Link
                    href={`/collection?category=${product.categorySlug}`}
                    className="pdp-cat-link"
                  >
                    {product.categoryName}
                  </Link>
                ) : (
                  product.categoryName
                )}
              </p>
            ) : null}
            <ProductVariantSelector product={product} />
          </div>
        </div>

        <RelatedProducts products={related} />
      </main>
      <Footer />
      <ScrollReveal />
    </>
  );
}
