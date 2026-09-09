import Link from 'next/link';

/**
 * Kares Studio — Phase 3 collection static states (server-safe).
 * Visual language matches the homepage: mono tags, grotesk headings,
 * pill buttons, card-tone skeleton blocks. No new design language.
 */

export function CollectionSkeleton() {
  return (
    <div className="shop-layout" aria-label="Loading collection">
      <aside className="shop-sidebar" aria-hidden="true">
        <div
          style={{
            height: '2.5rem',
            background: 'var(--card)',
            borderRadius: 9999,
          }}
        />
        <div
          style={{
            height: '10rem',
            background: 'var(--card)',
            borderRadius: 12,
            marginTop: '1.5rem',
          }}
        />
        <div
          style={{
            height: '6rem',
            background: 'var(--card)',
            borderRadius: 12,
            marginTop: '1.5rem',
          }}
        />
      </aside>
      <div className="shop-grid" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i}>
            <div className="prod-img" style={{ background: 'var(--card)' }} />
            <div className="prod-info">
              <p
                className="prod-name"
                style={{
                  width: '8rem',
                  height: '1rem',
                  background: 'var(--card)',
                }}
              />
              <p
                className="prod-price"
                style={{
                  width: '5rem',
                  height: '0.9rem',
                  background: 'var(--card)',
                  marginTop: '.5rem',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CollectionErrorState() {
  return (
    <div className="shop-state" role="alert">
      <div className="section-tag" style={{ justifyContent: 'center' }}>
        <span className="star">✹</span>
        <span className="label">[COLLECTION UNAVAILABLE]</span>
      </div>
      <h2>Gagal memuat koleksi</h2>
      <p>
        Terjadi masalah saat mengambil data produk. Periksa koneksi lalu coba
        lagi — tidak ada yang berubah dari koleksi Anda.
      </p>
      <div className="shop-state-actions">
        <Link href="/collection" className="btn-primary">
          Muat Ulang
        </Link>
        <Link href="/" className="btn-outline">
          Back to Home
        </Link>
      </div>
    </div>
  );
}

export function CollectionDbEmptyState() {
  return (
    <div className="shop-state">
      <div className="section-tag" style={{ justifyContent: 'center' }}>
        <span className="star">✹</span>
        <span className="label">[COLLECTION]</span>
      </div>
      <h2>Koleksi sedang dikurasi</h2>
      <p>
        Belum ada produk yang tersedia saat ini. Silakan kembali lagi —
        drop terbaru sedang disiapkan.
      </p>
      <div className="shop-state-actions">
        <Link href="/" className="btn-primary">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
