'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';

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
  const [saving, setSaving] = useState(false);

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
        <section className="admin-panel" aria-label="Category form">
          <h2>{editingId ? 'Edit Category' : 'Add Category'}</h2>
          <div className="admin-form">
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
              <span>Description</span>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <label>
              <span>Image URL (object path / URL)</span>
              <input
                type="text"
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                placeholder="/images/look-male-coat.jpeg"
              />
            </label>
            <div className="admin-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => void submit()}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save'}
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
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4}>Belum ada kategori.</td>
              </tr>
            ) : (
              rows.map((c) => (
                <tr key={c.id}>
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
