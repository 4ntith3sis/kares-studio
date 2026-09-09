'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';

interface Img {
  id: string;
  image_url: string;
  sort_order: number;
}

function publicUrl(path: string): string {
  if (path.startsWith('http') || path.startsWith('/')) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  return base ? `${base}/storage/v1/object/public/product-images/${path}` : path;
}

/**
 * Kares Studio — Admin Product Images (client).
 * Upload / delete / reorder (sort_order). Storage guard keeps shared
 * objects; PDP keeps reading via getPublicUrl.
 */
export default function AdminProductImagesClient({
  productId,
}: {
  productId: string;
}) {
  const [images, setImages] = useState<Img[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/images?product_id=${encodeURIComponent(productId)}`,
        { cache: 'no-store' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Gagal memuat gambar.');
      setImages(data.images ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat.');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('product_id', productId);
      form.append('file', file);
      const res = await fetch('/api/admin/images', {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload gagal.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload gagal.');
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Hapus gambar ini?')) return;
    try {
      const res = await fetch(`/api/admin/images?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Hapus gagal.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hapus gagal.');
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const next = [...images];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    const items = next.map((img, i) => ({ id: img.id, sort_order: i + 1 }));
    setImages(next);
    try {
      const res = await fetch('/api/admin/images', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Reorder gagal.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reorder gagal.');
      await load();
    }
  };

  return (
    <AdminShell title="Product Images">
      <label className="admin-mini-btn" style={{ width: 'fit-content' }}>
        {uploading ? 'Uploading…' : '+ Upload Image (≤5MB)'}
        <input
          type="file"
          accept="image/*"
          hidden
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = '';
          }}
        />
      </label>
      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? (
        <p className="admin-muted">Memuat gambar…</p>
      ) : images.length === 0 ? (
        <p className="admin-muted">Belum ada gambar untuk produk ini.</p>
      ) : (
        <div className="admin-img-row">
          {images.map((img, i) => (
            <div key={img.id} className="admin-img-cell" title={`#${img.sort_order} ${img.image_url}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={publicUrl(img.image_url)} alt={`Product image ${i + 1}`} loading="lazy" />
              <button type="button" onClick={() => void remove(img.id)} aria-label={`Delete image ${i + 1}`}>
                ×
              </button>
              <div style={{ position: 'absolute', bottom: '.25rem', left: '.25rem', display: 'flex', gap: '.25rem' }}>
                <button type="button" onClick={() => void move(i, -1)} disabled={i === 0} aria-label="Move left" style={{ position: 'static' }}>
                  ‹
                </button>
                <button type="button" onClick={() => void move(i, 1)} disabled={i === images.length - 1} aria-label="Move right" style={{ position: 'static' }}>
                  ›
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="admin-muted">
        Urutan = sort_order (kiri = utama). PDP &amp; Collection memakai gambar
        pertama otomatis.
      </p>
    </AdminShell>
  );
}
