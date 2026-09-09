'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { stockStatusOf, STOCK_STATUS_LABEL } from '@/lib/admin';

interface InvRow {
  id: string;
  product: { id: string; name: string; slug: string } | null;
  color: { id: string; name: string; hex_code: string } | null;
  size: { id: string; name: string; sort_order: number } | null;
  total_in: number;
  total_out: number;
  stock: number;
}

/**
 * Kares Studio — Admin Inventory (client).
 * Variant matrix + stock status (single threshold helper) + IN/OUT
 * transactions via /api/admin/inventory. Search/filter by product,
 * color, size, status.
 */
export default function AdminInventoryClient({
  initialStatus,
  initialProduct,
  initialAction,
}: {
  initialStatus: string;
  initialProduct: string;
  initialAction: string;
}) {
  const [rows, setRows] = useState<InvRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [search, setSearch] = useState(initialProduct);
  const [status, setStatus] = useState(initialStatus);
  const [colorFilter, setColorFilter] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');

  const [variantId, setVariantId] = useState('');
  const [type, setType] = useState<'in' | 'out'>(
    initialAction === 'out' ? 'out' : 'in'
  );
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/inventory', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Gagal memuat inventory.');
      setRows(data.rows ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const colors = useMemo(
    () =>
      Array.from(
        new Map(
          rows
            .filter((r) => r.color)
            .map((r) => [r.color!.id, r.color!.name])
        ).entries()
      ).sort((a, b) => a[1].localeCompare(b[1])),
    [rows]
  );
  const sizes = useMemo(
    () =>
      Array.from(
        new Map(
          rows
            .filter((r) => r.size)
            .map((r) => [r.size!.id, r.size!.name])
        ).entries()
      ).sort((a, b) => a[1].localeCompare(b[1])),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !(r.product?.name ?? '').toLowerCase().includes(q)) return false;
      if (colorFilter && r.color?.id !== colorFilter) return false;
      if (sizeFilter && r.size?.id !== sizeFilter) return false;
      if (status) {
        const s = stockStatusOf(r.stock);
        if (s !== status) return false;
      }
      return true;
    });
  }, [rows, search, status, colorFilter, sizeFilter]);

  const submitTxn = async () => {
    const qty = Number(quantity);
    if (!variantId) {
      setError('Pilih variant terlebih dahulu.');
      return;
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      setError('Quantity harus integer > 0.');
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variant_id: variantId,
          type,
          quantity: qty,
          note: note.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Transaksi gagal.');
      setNotice(
        `Stock ${type === 'in' ? 'IN' : 'OUT'} ${qty} berhasil dicatat.`
      );
      setQuantity('');
      setNote('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transaksi gagal.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell title="Inventory">
      <section className="admin-panel" aria-label="Stock transaction">
        <h2>Stock {type === 'in' ? 'In' : 'Out'}</h2>
        <div className="admin-form">
          <label>
            <span>Variant (Product — Color / Size — Stock)</span>
            <select
              value={variantId}
              onChange={(e) => setVariantId(e.target.value)}
            >
              <option value="">— Pilih variant —</option>
              {rows.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.product?.name ?? '?'} — {r.color?.name ?? '?'} /{' '}
                  {r.size?.name ?? '?'} — Stock {r.stock}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'in' | 'out')}
            >
              <option value="in">IN (tambah stok)</option>
              <option value="out">OUT (kurangi stok)</option>
            </select>
          </label>
          <label>
            <span>Quantity *</span>
            <input
              type="text"
              inputMode="numeric"
              value={quantity}
              onChange={(e) =>
                setQuantity(e.target.value.replace(/[^0-9]/g, ''))
              }
              placeholder="10"
            />
          </label>
          <label>
            <span>Note</span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Restock / retur / koreksi…"
            />
          </label>
          <div className="admin-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => void submitTxn()}
              disabled={saving}
            >
              {saving ? 'Saving…' : `Record ${type === 'in' ? 'IN' : 'OUT'}`}
            </button>
          </div>
        </div>
      </section>

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

      <div className="admin-toolbar" role="search">
        <input
          type="search"
          placeholder="Cari product…"
          aria-label="Cari product"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Filter color"
          value={colorFilter}
          onChange={(e) => setColorFilter(e.target.value)}
        >
          <option value="">Semua color</option>
          {colors.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter size"
          value={sizeFilter}
          onChange={(e) => setSizeFilter(e.target.value)}
        >
          <option value="">Semua size</option>
          {sizes.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Semua status</option>
          <option value="in">IN STOCK</option>
          <option value="low">LOW STOCK</option>
          <option value="out">OUT OF STOCK</option>
        </select>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Color</th>
              <th>Size</th>
              <th>Stock</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5}>Memuat inventory…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5}>Tidak ada variant yang cocok.</td>
              </tr>
            ) : (
              filtered.map((r) => {
                const s = stockStatusOf(r.stock);
                return (
                  <tr key={r.id}>
                    <td>{r.product?.name ?? '—'}</td>
                    <td>{r.color?.name ?? '—'}</td>
                    <td>{r.size?.name ?? '—'}</td>
                    <td>
                      {r.stock} <span style={{ color: 'var(--muted)' }}>(in {r.total_in} / out {r.total_out})</span>
                    </td>
                    <td>
                      <span className={`admin-pill ${s}`}>
                        {STOCK_STATUS_LABEL[s]}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
