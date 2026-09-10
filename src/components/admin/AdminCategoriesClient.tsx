'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import ConfirmDialog, {
  type ConfirmDialogData,
} from '@/components/admin/ConfirmDialog';
import { resolveImageUrlPublic } from '@/lib/images';

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
  productCount: number;
}

/**
 * Kares Studio — Admin Categories (client).
 * List + search/sort + create/rename/describe/image + guarded delete
 * (409 when products still reference the category).
 * Layout disamakan dengan Admin Products.
 */
type SortKey = 'newest' | 'name-asc' | 'name-desc' | 'products';

export default function AdminCategoriesClient({ showNew }: { showNew: boolean }) {
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(showNew);
  const [form, setForm] = useState({ name: '', description: '', image_url: '' });
  const [editingSlug, setEditingSlug] = useState('');
  const [confirm, setConfirm] = useState<
    (ConfirmDialogData & { action: () => void }) | null
  >(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const previewUrl = (path: string) =>
    resolveImageUrlPublic(path, process.env.NEXT_PUBLIC_SUPABASE_URL);

  const uploadImage = async (file: File) => {
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      setError('File harus gambar ≤ 5 MB.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/category-image', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload gagal.');
      setForm((prev) => ({
        ...prev,
        image_url: (data as { path: string }).path,
      }));
      setNotice('Gambar diunggah ke Storage — klik Save untuk menerapkan.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload gagal.');
    } finally {
      setUploading(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/categories', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Gagal memuat kategori.');
      setRows(data.categories ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = rows.filter(
      (c) => !q || `${c.name} ${c.slug}`.toLowerCase().includes(q)
    );
    const sorted = [...list];
    switch (sort) {
      case 'name-asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'products':
        sorted.sort((a, b) => b.productCount - a.productCount);
        break;
      default:
        sorted.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }
    return sorted;
  }, [rows, search, sort]);

  const openEdit = (c: CategoryRow) => {
    setEditingId(c.id);
    setCreating(false);
    setEditingSlug(c.slug);
    setForm({
      name: c.name,
      description: c.description ?? '',
      image_url: c.image_url ?? '',
    });
    setNotice(null);
  };

  const submit = async () => {
    if (!form.name.trim()) {
      setError('Nama kategori wajib diisi.');
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch('/api/admin/categories', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          name: form.name.trim(),
          description: form.description.trim() || null,
          image_url: form.image_url.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Simpan gagal.');
      setNotice(editingId ? 'Kategori diperbarui.' : 'Kategori dibuat.');
      setEditingId(null);
      setCreating(false);
      setForm({ name: '', description: '', image_url: '' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Simpan gagal.');
    } finally {
      setSaving(false);
    }
  };

  const askRemove = (c: CategoryRow) => {
    setConfirm({
      title: 'Hapus Kategori?',
      message: `Hapus kategori "${c.name}"? Diblokir bila masih dipakai ${c.productCount} produk.`,
      confirmLabel: 'Ya, Hapus',
      danger: true,
      action: () => void remove(c),
    });
  };

  const remove = async (c: CategoryRow) => {
    try {
      const res = await fetch(
        `/api/admin/categories?id=${encodeURIComponent(c.id)}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Hapus gagal.');
      setNotice(`"${c.name}" dihapus.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hapus gagal.');
    }
  };

  return (
    <AdminShell title="Categories">
      <ConfirmDialog
        dialog={confirm}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const c = confirm;
          setConfirm(null);
          c?.action();
        }}
      />
      <div className="admin-toolbar" role="search">
        <input
          type="search"
          placeholder="Cari nama / slug…"
          aria-label="Cari kategori"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Urutkan"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
        >
          <option value="newest">Terbaru</option>
          <option value="name-asc">Nama A-Z</option>
          <option value="name-desc">Nama Z-A</option>
          <option value="products">Produk terbanyak</option>
        </select>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setCreating(true);
            setEditingId(null);
            setEditingSlug('');
            setForm({ name: '', description: '', image_url: '' });
          }}
        >
          + Add Category
        </button>
      </div>
      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="admin-success" role="status">
          {notice}
        </p>
      ) : null}

      {(creating || editingId) && (
        <section className="admin-panel" aria-label={editingId ? 'Edit category' : 'Add category'}>
          <h2>{editingId ? `Edit — ${form.name || 'Category'}` : 'Add Category'}</h2>
          <div className="admin-form">
            <h3 className="admin-section-title">A. Category Information</h3>
            <label>
              <span>Name *</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Outerwear"
              />
            </label>
            <label>
              <span>Slug</span>
              <input
                type="text"
                value={editingSlug}
                readOnly
                disabled
                placeholder="auto dari nama"
              />
            </label>
            <label>
              <span>Description</span>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <h3 className="admin-section-title">B. Category Image</h3>
            <div>
              <span
                style={{
                  fontFamily: "'DM Mono',monospace",
                  fontSize: 10,
                  letterSpacing: '.15em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  display: 'block',
                  marginBottom: '.5rem',
                }}
              >
                Category Image
              </span>
              <div className="admin-img-row">
                <div className="admin-img-cell">
                  {form.image_url && previewUrl(form.image_url) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl(form.image_url) as string}
                      alt="Category preview"
                      loading="lazy"
                    />
                  ) : (
                    <span
                      className="admin-edit-thumb-empty"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        textAlign: 'center',
                      }}
                    >
                      No image
                    </span>
                  )}
                </div>
                <label className="admin-mini-btn" style={{ alignSelf: 'center' }}>
                  {uploading ? 'Uploading…' : 'Ganti Gambar'}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadImage(f);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            </div>
            <div className="admin-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => void submit()}
                disabled={saving}
              >
                {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Category'}
              </button>
              <button
                type="button"
                className="btn-outline"
                onClick={() => {
                  setEditingId(null);
                  setCreating(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Description</th>
              <th>Products</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4}>Memuat kategori…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4}>Tidak ada kategori yang cocok.</td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
                      <span className="admin-thumb" aria-hidden="true">
                        {previewUrl(c.image_url ?? '') ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={previewUrl(c.image_url ?? '') as string}
                            alt=""
                            loading="lazy"
                          />
                        ) : null}
                      </span>
                      <span>
                        <strong>{c.name}</strong>
                        <br />
                        <span style={{ color: 'var(--muted)', fontSize: 11 }}>
                          /{c.slug}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td style={{ maxWidth: '24rem' }}>{c.description ?? '—'}</td>
                  <td>{c.productCount}</td>
                  <td>
                    <div className="admin-row-actions">
                      <button
                        type="button"
                        className="admin-mini-btn"
                        onClick={() => openEdit(c)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="admin-mini-btn danger"
                        onClick={() => askRemove(c)}
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
