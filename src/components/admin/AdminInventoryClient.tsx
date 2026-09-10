'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
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

interface HistRow {
  id: string;
  type: string;
  quantity: number;
  note: string | null;
  created_at: string;
  productName: string;
  variantLabel: string;
}

/**
 * Kares Studio — Admin Inventory (client).
 * Variant matrix + stock status (single threshold helper) + IN/OUT
 * transactions via /api/admin/inventory. Search/filter by product,
 * color, size, status. Rows with the same product + color are grouped
 * so sizes branch beneath one color.
 */
const INV_ROW_H = 2.5; // rem — shared rhythm so branched cells align
const invLine: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  minHeight: `${INV_ROW_H}rem`,
};

function groupInvRows(list: InvRow[]): InvRow[][] {
  const groups: { key: string; items: InvRow[] }[] = [];
  for (const item of list) {
    const key = item.product?.id ?? item.id;
    const g = groups.find((x) => x.key === key);
    if (g) g.items.push(item);
    else groups.push({ key, items: [item] });
  }
  return groups.map((g) => g.items);
}

/** Di dalam satu produk: kelompokkan varian per warna (ukuran bercabang). */
function groupByColor(items: InvRow[]): InvRow[][] {
  const groups: { key: string; items: InvRow[] }[] = [];
  for (const item of items) {
    const key = item.color?.id ?? item.id;
    const g = groups.find((x) => x.key === key);
    if (g) g.items.push(item);
    else groups.push({ key, items: [item] });
  }
  return groups.map((g) => g.items);
}
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

  // Transaksi dikelola per grup produk+warna: 1 status + 1 tombol aksi
  // per grup, sejajar di tengah baris. Ukuran dipilih di dalam modal.
  const [managing, setManaging] = useState<InvRow[] | null>(null);
  const [manageVariantId, setManageVariantId] = useState('');
  const [modalType, setModalType] = useState<'in' | 'out'>('in');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/admin/inventory?history=1', {
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Gagal memuat riwayat.');
      setHistory(data.history ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat riwayat.');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const toggleHistory = () => {
    if (!showHistory && history.length === 0) void loadHistory();
    setShowHistory((v) => !v);
  };

  const openManage = (items: InvRow[]) => {
    setManaging(items);
    setManageVariantId(items[0]?.id ?? '');
    setModalType('in');
    setQuantity('');
    setNote('');
    setError(null);
    setNotice(null);
  };

  const closeManage = () => {
    setManaging(null);
    setManageVariantId('');
    setQuantity('');
    setNote('');
  };

  const selected =
    managing?.find((r) => r.id === manageVariantId) ?? managing?.[0] ?? null;

  // Tutup modal dengan Escape.
  useEffect(() => {
    if (!managing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeManage();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [managing]);

  const estimate = (() => {
    if (!selected) return 0;
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) return selected.stock;
    return modalType === 'in'
      ? selected.stock + qty
      : selected.stock - qty;
  })();

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
    if (!selected) return;
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      setError('Quantity harus integer > 0.');
      return;
    }
    if (modalType === 'out' && qty > selected.stock) {
      setError(
        `Stock tidak cukup (sisa ${selected.stock}).`
      );
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
          variant_id: selected.id,
          type: modalType,
          quantity: qty,
          note: note.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Transaksi gagal.');
      setNotice(
        `Stock ${modalType === 'in' ? 'IN' : 'OUT'} ${qty} berhasil dicatat untuk ${selected.product?.name ?? 'variant'} (${selected.color?.name ?? '?'} / ${selected.size?.name ?? '?'}).`
      );
      closeManage();
      await load();
      if (showHistory || history.length > 0) await loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transaksi gagal.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell title="Inventory">
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
        <button type="button" className="btn-outline" onClick={toggleHistory}>
          {showHistory ? 'Kembali ke Stok' : 'History'}
        </button>
      </div>

      {showHistory ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Produk</th>
                <th>Varian</th>
                <th>Jenis</th>
                <th>Jumlah</th>
                <th>Catatan</th>
              </tr>
            </thead>
            <tbody>
              {historyLoading ? (
                <tr>
                  <td colSpan={6}>Memuat riwayat…</td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={6}>Belum ada catatan penambahan/pengurangan.</td>
                </tr>
              ) : (
                history.map((h) => (
                  <tr key={h.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {new Date(h.created_at).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td>{h.productName}</td>
                    <td>{h.variantLabel}</td>
                    <td>
                      <span className={`admin-pill ${h.type === 'in' ? 'in' : 'out'}`}>
                        {h.type === 'in' ? 'Penambahan' : 'Pengurangan'}
                      </span>
                    </td>
                    <td>
                      {h.type === 'in' ? '+' : '-'}{h.quantity}
                    </td>
                    <td style={{ maxWidth: '20rem' }}>{h.note ?? '—'}</td>
                </tr>
              )))
            }
            </tbody>
          </table>
        </div>
      ) : (
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
                <tr>
                  <th>Product</th>
                  <th>Color</th>
                  <th>Size</th>
                  <th>Stock</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6}>Memuat inventory…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6}>Tidak ada variant yang cocok.</td>
              </tr>
            ) : (
              groupInvRows(filtered).map((items) => {
                const colorGroups = groupByColor(items);
                return (
                <tr key={items[0]?.id ?? ''}>
                  <td>
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        minHeight: `${items.length * INV_ROW_H}rem`,
                      }}
                    >
                      {items[0]?.product?.name ?? '—'}
                    </span>
                  </td>
                  <td>
                    {colorGroups.map((cg) => (
                      <span
                        key={cg[0]?.id ?? ''}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          minHeight: `${cg.length * INV_ROW_H}rem`,
                        }}
                      >
                        {cg[0]?.color?.name ?? '—'}
                      </span>
                    ))}
                  </td>
                  <td>
                    {items.map((r) => (
                      <span key={r.id} style={invLine}>
                        {r.size?.name ?? '—'}
                      </span>
                    ))}
                  </td>
                  <td>
                    {items.map((r) => (
                      <span key={r.id} style={invLine}>
                        {r.stock}
                      </span>
                    ))}
                  </td>
                  <td>
                    {items.map((r) => {
                      const s = stockStatusOf(r.stock);
                      return (
                        <span
                          key={r.id}
                          style={{ ...invLine, justifyContent: 'center' }}
                        >
                          <span className={`admin-pill ${s}`}>
                            {STOCK_STATUS_LABEL[s]}
                          </span>
                        </span>
                      );
                    })}
                  </td>
                  <td>
                    {items.map((r) => (
                      <span
                        key={r.id}
                        style={{ ...invLine, justifyContent: 'center' }}
                      >
                        <div
                          className="admin-row-actions"
                          style={{ justifyContent: 'center' }}
                        >
                          <button
                            type="button"
                            className="admin-mini-btn"
                            onClick={() => openManage([r])}
                          >
                            Kelola Stok
                          </button>
                        </div>
                      </span>
                    ))}
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      )}

      {managing && selected ? (
        <div
          className="modal-overlay"
          onClick={closeManage}
          role="dialog"
          aria-modal="true"
          aria-label="Kelola stok"
        >
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2>Kelola Stok</h2>
                <p className="admin-muted">
                  {selected.product?.name ?? 'Variant'} —{' '}
                  {selected.color?.name ?? '?'}
                </p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={closeManage}
                aria-label="Tutup"
              >
                ×
              </button>
            </div>
            <div className="modal-stock-box">
              <div>
                <span>Stok saat ini</span>
                <strong>{selected.stock}</strong>
              </div>
              <div>
                <span>Estimasi stok baru</span>
                <strong>{estimate}</strong>
              </div>
            </div>
            <div className="admin-form">
              {managing.length > 1 ? (
                <label>
                  <span>Ukuran</span>
                  <select
                    value={manageVariantId}
                    onChange={(e) => {
                      setManageVariantId(e.target.value);
                      setModalType('in');
                      setQuantity('');
                    }}
                  >
                    {managing.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.size?.name ?? '?'} — Stok {r.stock}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <p className="admin-muted">
                  Ukuran: {selected.size?.name ?? '?'}
                </p>
              )}
              <span
                style={{
                  fontFamily: "'DM Mono',monospace",
                  fontSize: 10,
                  letterSpacing: '.15em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                }}
              >
                Jenis perubahan
              </span>
              <div className="modal-type-row" role="group" aria-label="Jenis perubahan">
                <button
                  type="button"
                  className={`modal-type-btn${modalType === 'in' ? ' active' : ''}`}
                  onClick={() => setModalType('in')}
                  aria-pressed={modalType === 'in'}
                >
                  ↗ Stock In
                </button>
                <button
                  type="button"
                  className={`modal-type-btn${modalType === 'out' ? ' active' : ''}`}
                  onClick={() => setModalType('out')}
                  aria-pressed={modalType === 'out'}
                  disabled={selected.stock <= 0}
                  title={selected.stock <= 0 ? 'Stok habis' : 'Kurangi stok'}
                >
                  ↘ Stock Out
                </button>
              </div>
              <label>
                <span>Jumlah *</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(e.target.value.replace(/[^0-9]/g, ''))
                  }
                  placeholder="Contoh: 10"
                />
              </label>
              <label>
                <span>Catatan (opsional)</span>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Contoh: Restock gudang, retur…"
                />
              </label>
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="btn-outline"
                onClick={closeManage}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => void submitTxn()}
                disabled={saving}
              >
                {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
