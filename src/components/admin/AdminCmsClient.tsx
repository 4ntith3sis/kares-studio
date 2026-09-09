'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { CMS_SECTIONS } from '@/lib/cms-fields';
import { resolveImageUrlPublic } from '@/lib/images';

interface Entry {
  section: string;
  key: string;
  value: string | null;
  image_url: string | null;
}

/**
 * Kares Studio — Admin Homepage CMS (client).
 * Field-based editor only: text fields + image path fields + image
 * upload to the product-images bucket. No layout/typography controls.
 * One PATCH upsert for all dirty fields; preview links the storefront.
 */
export default function AdminCmsClient() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [needsMigration, setNeedsMigration] = useState(false);

  // Supabase public URL preview (never a local path as source).
  const previewUrl = (path: string) =>
    resolveImageUrlPublic(path, process.env.NEXT_PUBLIC_SUPABASE_URL);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNeedsMigration(false);
    try {
      const res = await fetch('/api/admin/cms', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        if (data.needsMigration) setNeedsMigration(true);
        throw new Error(data.error ?? 'Gagal memuat CMS.');
      }
      const list = (data.entries ?? []) as Entry[];
      setEntries(list);
      const d: Record<string, string> = {};
      for (const e of list) {
        // Image-type fields read image_url; text fields read value.
        d[`${e.section}.${e.key}`] = e.image_url ?? e.value ?? '';
      }
      setDrafts(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const entryOf = useMemo(() => {
    const m = new Map<string, Entry>();
    for (const e of entries) m.set(`${e.section}.${e.key}`, e);
    return m;
  }, [entries]);

  const dirty = useMemo(() => {
    const out: { section: string; key: string; value?: string; image_url?: string }[] = [];
    for (const section of CMS_SECTIONS) {
      for (const f of section.fields) {
        const k = `${f.section}.${f.key}`;
        const current = drafts[k] ?? '';
        const saved = entryOf.get(k);
        const savedVal = f.type === 'image'
          ? (saved?.image_url ?? '')
          : (saved?.value ?? '');
        if (current !== savedVal) {
          out.push(
            f.type === 'image'
              ? { section: f.section, key: f.key, image_url: current || null as unknown as string }
              : { section: f.section, key: f.key, value: current }
          );
        }
      }
    }
    return out;
  }, [drafts, entryOf]);

  const save = async () => {
    if (dirty.length === 0) {
      setNotice('Tidak ada perubahan.');
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch('/api/admin/cms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: dirty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Simpan gagal.');
      setNotice(`${data.updated ?? dirty.length} field tersimpan. Lihat hasilnya di Preview.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Simpan gagal.');
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (section: string, key: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('File harus gambar.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Gambar harus ≤ 5 MB.');
      return;
    }
    setUploadingKey(`${section}.${key}`);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/admin/cms-image', {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload gagal.');
      setDrafts((prev) => ({
        ...prev,
        [`${section}.${key}`]: (data as { path: string }).path,
      }));
      setNotice('Gambar diunggah — klik Save Changes untuk menerapkan.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload gagal.');
    } finally {
      setUploadingKey(null);
    }
  };

  return (
    <AdminShell title="Homepage CMS">
      <div className="admin-toolbar">
        <a className="btn-outline" href="/" target="_blank" rel="noopener noreferrer">
          Preview Homepage ↗
        </a>
        <button
          type="button"
          className="btn-primary"
          onClick={() => void save()}
          disabled={saving || dirty.length === 0}
        >
          {saving ? 'Saving…' : `Save Changes${dirty.length > 0 ? ` (${dirty.length})` : ''}`}
        </button>
      </div>
      <p className="admin-muted">
        CMS hanya mengubah TULISAN dan FOTO. Layout, typography, spacing, dan
        responsive tidak dapat diubah dari sini.
      </p>
      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}
      {needsMigration ? (
        <p className="admin-error" role="alert">
          Migration CMS belum dijalankan. Instruksi: buka Supabase Dashboard
          → SQL Editor → jalankan file{' '}
          <code>supabase/migrations/0002_phase6_admin_cms.sql</code> satu kali,
          lalu refresh halaman ini. Homepage tetap tampil dengan konten
          fallback selama migration belum ada.
        </p>
      ) : null}
      {notice ? (
        <p className="admin-success" role="status">
          {notice}
        </p>
      ) : null}
      {loading ? (
        <p className="admin-muted">Memuat konten…</p>
      ) : (
        <div className="admin-cms-grid">
          {CMS_SECTIONS.map((section) => (
            <section key={section.id} className="admin-panel" aria-label={section.title}>
              <h2>{section.title}</h2>
              <p className="admin-muted" style={{ marginBottom: '1rem' }}>
                {section.description}
              </p>
              <div className="admin-form">
                {section.fields.map((f) => {
                  const k = `${f.section}.${f.key}`;
                  const val = drafts[k] ?? '';
                  return (
                    <label key={k} className="admin-cms-field">
                      <span>{f.label}</span>
                      {f.type === 'textarea' ? (
                        <textarea
                          value={val}
                          onChange={(e) =>
                            setDrafts((prev) => ({ ...prev, [k]: e.target.value }))
                          }
                        />
                      ) : (
                        <input
                          type="text"
                          value={val}
                          placeholder={f.type === 'image' ? 'cms/... / https://...' : ''}
                          onChange={(e) =>
                            setDrafts((prev) => ({ ...prev, [k]: e.target.value }))
                          }
                        />
                      )}
                      {f.hint ? (
                        <span style={{ textTransform: 'none', letterSpacing: 0 }}>{f.hint}</span>
                      ) : null}
                      {f.type === 'image' ? (
                        <span>
                          {previewUrl(val) ? (
                            <span
                              className="admin-img-cell"
                              style={{ margin: '.25rem 0 .5rem', display: 'block' }}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={previewUrl(val) as string}
                                alt={`${f.label} preview`}
                                loading="lazy"
                              />
                            </span>
                          ) : null}
                          <label className="admin-mini-btn" style={{ width: 'fit-content' }}>
                            {uploadingKey === k ? 'Uploading...' : 'Upload Image → cms/'}
                            <input
                              type="file"
                              accept="image/*"
                              hidden
                              disabled={uploadingKey === k}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) void uploadImage(f.section, f.key, file);
                                e.target.value = '';
                              }}
                            />
                          </label>
                        </span>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
