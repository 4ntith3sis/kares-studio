import Link from 'next/link';
import { cookies } from 'next/headers';
import type { CSSProperties } from 'react';
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
    availableProducts: number;
    emptyProducts: number;
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
  product: { id: string; name: string; slug: string; price: number } | null;
  categoryName: string;
  colorName: string;
  sizeName: string;
  stock: number;
  imageUrl: string | null;
}

interface ProductGroup {
  key: string;
  product: { id: string; name: string; slug: string; price: number } | null;
  categoryName: string;
  imageUrl: string | null;
  variants: VariantRow[];
}

const cellLine: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  minHeight: '1.9rem',
};

async function loadStats(): Promise<StatsPayload | null> {
  try {
    const base =
      process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    // Forward the admin session cookies so /api/admin/stats (requireAdmin)
    // sees the same logged-in user as this page request.
    const res = await fetch(`${base.replace(/\/$/, '')}/api/admin/stats`, {
      cache: 'no-store',
      headers: { cookie: cookies().toString() },
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

function ThinningRow({ group }: { group: ProductGroup }) {
  // Varian dengan warna sama digabung: warna tampil sekali, ukuran bercabang.
  const colorGroups: { color: string; items: VariantRow[] }[] = [];
  for (const v of group.variants) {
    const g = colorGroups.find((cg) => cg.color === v.colorName);
    if (g) {
      g.items.push(v);
    } else {
      colorGroups.push({ color: v.colorName, items: [v] });
    }
  }
  return (
    <tr>
      <td>
        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
          <span className="admin-thumb" aria-hidden="true">
            {group.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={group.imageUrl} alt="" loading="lazy" />
            ) : null}
          </span>
          <Link href={`/admin/inventory?product=${group.product?.slug ?? ''}`}>
            {group.product?.name ?? 'Unknown product'}
          </Link>
        </div>
      </td>
      <td>{group.categoryName}</td>
      <td>
        {colorGroups.map((cg) => (
          <span
            key={cg.color}
            style={{
              display: 'flex',
              alignItems: 'center',
              minHeight: `${cg.items.length * 1.9}rem`,
            }}
          >
            {cg.color}
          </span>
        ))}
      </td>
      <td>
        {group.variants.map((v) => (
          <span key={v.id} style={cellLine}>
            {v.sizeName}
          </span>
        ))}
      </td>
      <td>
        {group.variants.map((v) => {
          const empty = v.stock <= 0;
          return (
            <span key={v.id} style={cellLine}>
              <span
                style={{
                  fontWeight: 700,
                  color: empty ? '#b3261e' : '#9a6700',
                }}
              >
                {empty ? 'Habis' : `Sisa ${v.stock}`}
              </span>
            </span>
          );
        })}
      </td>
      <td>{group.product ? formatIDR(group.product.price) : '—'}</td>
    </tr>
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
  const thinning = [...data.lowStockProducts, ...data.outOfStockProducts];
  const grouped = new Map<string, ProductGroup>();
  for (const r of thinning) {
    const key = r.product?.id ?? r.id;
    const g = grouped.get(key);
    if (g) {
      g.variants.push(r);
    } else {
      grouped.set(key, {
        key,
        product: r.product,
        categoryName: r.categoryName,
        imageUrl: r.imageUrl,
        variants: [r],
      });
    }
  }
  const groups = Array.from(grouped.values());
  return (
    <AdminShell title="Dashboard">
      <div className="admin-stats">
        <StatCard label="Total Produk" value={stats.totalProducts} href="/admin/products" />
        <StatCard label="Total Categories" value={stats.totalCategories} href="/admin/categories" />
        <StatCard label="Produk Tersedia" value={stats.availableProducts} href="/admin/inventory" />
        <StatCard label="Produk Habis" value={stats.emptyProducts} href="/admin/inventory?status=out" />
      </div>

      <section className="admin-panel" aria-label="Stok menipis">
        <h2>Stok Menipis</h2>
        {thinning.length === 0 ? (
          <p className="admin-muted">Semua stok aman.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Produk</th>
                  <th>Kategori</th>
                  <th>Warna</th>
                  <th>Ukuran</th>
                  <th>Stok</th>
                  <th>Harga</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <ThinningRow key={g.key} group={g} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="admin-note">
        Admin UI tanpa login — siapa pun yang membuka /admin dapat mengubah
        data. Tambahkan Admin Auth (fase berikutnya) sebelum production.
      </p>
    </AdminShell>
  );
}
