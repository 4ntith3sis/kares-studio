import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import { formatIDR } from '@/lib/utils/format';

/**
 * Kares Studio — Admin Dashboard (server).
 * REAL Supabase data via /admin/stats API (service role, server-side).
 * Falls back to an error panel when stats are unreachable.
 */

interface StatsPayload {
  stats: {
    totalProducts: number;
    activeProducts: number;
    inactiveProducts: number;
    totalCategories: number;
    totalVariants: number;
    totalStock: number;
    lowStock: number;
    outOfStock: number;
  };
  recentProducts: {
    id: string;
    name: string;
    slug: string;
    price: number;
    featured: boolean;
    is_active: boolean;
    created_at: string;
  }[];
  lowStockProducts: VariantRow[];
  outOfStockProducts: VariantRow[];
}

interface VariantRow {
  id: string;
  product: { id: string; name: string; slug: string } | null;
  colorName: string;
  sizeName: string;
  stock: number;
}

async function loadStats(): Promise<StatsPayload | null> {
  try {
    const base =
      process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const res = await fetch(`${base.replace(/\/$/, '')}/api/admin/stats`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as StatsPayload;
  } catch {
    return null;
  }
}

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href?: string;
}) {
  const body = (
    <>
      <span className="admin-stat-value">{value}</span>
      <span className="admin-stat-label">{label}</span>
    </>
  );
  return href ? (
    <Link href={href} className="admin-stat-card">
      {body}
    </Link>
  ) : (
    <div className="admin-stat-card">{body}</div>
  );
}

function VariantLine({ row }: { row: VariantRow }) {
  return (
    <li>
      <Link href={`/admin/inventory?product=${row.product?.slug ?? ''}`}>
        {row.product?.name ?? 'Unknown product'}
      </Link>
      <span>
        {row.colorName} / {row.sizeName} · Stock: {row.stock}
      </span>
    </li>
  );
}

export default async function AdminDashboardPage() {
  const data = await loadStats();

  if (!data) {
    return (
      <AdminShell title="Dashboard">
        <div className="admin-panel" role="alert">
          <h2>Statistik tidak dapat dimuat</h2>
          <p>
            Periksa koneksi Supabase dan pastikan migration Phase 6 sudah
            dijalankan. Storefront tetap berjalan normal.
          </p>
        </div>
      </AdminShell>
    );
  }

  const { stats } = data;
  return (
    <AdminShell title="Dashboard">
      <div className="admin-stats">
        <StatCard label="Total Product" value={stats.totalProducts} href="/admin/products" />
        <StatCard label="Active" value={stats.activeProducts} href="/admin/products?status=active" />
        <StatCard label="Inactive" value={stats.inactiveProducts} href="/admin/products?status=inactive" />
        <StatCard label="Categories" value={stats.totalCategories} href="/admin/categories" />
        <StatCard label="Variants" value={stats.totalVariants} href="/admin/inventory" />
        <StatCard label="Total Stock" value={stats.totalStock} href="/admin/inventory" />
        <StatCard label="Low Stock" value={stats.lowStock} href="/admin/inventory?status=low" />
        <StatCard label="Out of Stock" value={stats.outOfStock} href="/admin/inventory?status=out" />
      </div>

      <div className="admin-grid-2">
        <section className="admin-panel" aria-label="Recent products">
          <h2>Recent Products</h2>
          {data.recentProducts.length === 0 ? (
            <p className="admin-muted">Belum ada produk.</p>
          ) : (
            <ul className="admin-list">
              {data.recentProducts.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/products?search=${encodeURIComponent(p.name)}`}>
                    {p.name}
                  </Link>
                  <span>
                    {formatIDR(p.price)} · {p.is_active ? 'Active' : 'Inactive'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-panel" aria-label="Stock alerts">
          <h2>Low Stock</h2>
          {data.lowStockProducts.length === 0 ? (
            <p className="admin-muted">Tidak ada low stock. 🎉</p>
          ) : (
            <ul className="admin-list">
              {data.lowStockProducts.map((r) => (
                <VariantLine key={r.id} row={r} />
              ))}
            </ul>
          )}
          <h2 style={{ marginTop: '1.5rem' }}>Out of Stock</h2>
          {data.outOfStockProducts.length === 0 ? (
            <p className="admin-muted">Tidak ada yang habis.</p>
          ) : (
            <ul className="admin-list">
              {data.outOfStockProducts.map((r) => (
                <VariantLine key={r.id} row={r} />
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="admin-panel" aria-label="Quick actions">
        <h2>Quick Actions</h2>
        <div className="admin-actions">
          <Link href="/admin/products?new=1" className="btn-primary">
            Add Product
          </Link>
          <Link href="/admin/categories?new=1" className="btn-outline">
            Add Category
          </Link>
          <Link href="/admin/inventory?action=in" className="btn-outline">
            Stock In
          </Link>
          <Link href="/admin/cms" className="btn-outline">
            Manage Homepage
          </Link>
        </div>
      </section>

      <p className="admin-note">
        Admin UI tanpa login — siapa pun yang membuka /admin dapat mengubah
        data. Tambahkan Admin Auth (fase berikutnya) sebelum production.
      </p>
    </AdminShell>
  );
}
