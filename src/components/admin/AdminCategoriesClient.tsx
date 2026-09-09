'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
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
 * Create/rename/describe/image + guarded delete (409 when products
 * still reference the category).
 */
export default function AdminCategoriesClient({ showNew }: { showNew: boolean }) {
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(showNew);
  const [form, setForm] = useState({ name: '', description: '', image_url: '' });
  const [editingSlug, setEditingSlug] = useState('');
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

  const remove = async (c: CategoryRow) => {
    if (
      !window.confirm(
        `Hapus kategori "${c.name}"? Diblokir bila masih dipakai ${c.productCount} produk.`
      )
    ) {
      return;
    }
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
      <div className="admin-toolbar">
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
        <section className="admin-panel admin-compact" aria-label="Category form">
          <h2>{editingId ? 'Edit Category' : 'Add Category'}</h2>
          <div className="admin-form admin-form-compact">
            <div className="admin-edit-grid">
              <div className="admin-edit-thumb">
                {form.image_url && previewUrl(form.image_url) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl(form.image_url) as string}
                    alt="Category preview"
                    loading="lazy"
                  />
                ) : (
                  <span className="admin-edit-thumb-empty">No image</span>
                )}
                <label className="admin-mini-btn">
                  {uploading ? 'Uploading…' : 'Change'}
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
              <div className="admin-edit-fields">
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
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </label>
                <label className="admin-check">
                  <input
                    type="checkbox"
                    checked
                    readOnly
                    disabled
                    aria-label="Active (always on)"
                  />
                  <span>Active</span>
                </label>
              </div>
            </div>
            <div className="admin-actions admin-actions-compact">
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
              <button
                type="button"
                className="btn-primary"
                onClick={() => void submit()}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Category</th>
              <th>Description</th>
              <th>Products</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5}>Memuat kategori...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5}>Belum ada kategori.</td>
              </tr>
            ) : (
              rows.map((c) => (
                <tr key={c.id}>
                  <td>
                    <span className="admin-thumb-cat" aria-hidden="true">
                      {previewUrl(c.image_url ?? '') ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={previewUrl(c.image_url ?? '') as string}
                          alt=""
                          loading="lazy"
                        />
                      ) : null}
                    </span>
                  </td>
                  <td>
                    <strong>{c.name}</strong>
                    <br />
                    <span style={{ color: 'var(--muted)', fontSize: 11 }}>
                      /{c.slug}
                    </span>
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
                        onClick={() => void remove(c)}
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
