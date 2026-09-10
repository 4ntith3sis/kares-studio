'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import ConfirmDialog, {
  type ConfirmDialogData,
} from '@/components/admin/ConfirmDialog';
import { formatIDR } from '@/lib/utils/format';
import { resolveImageUrlPublic } from '@/lib/images';

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  price: number;
  featured: boolean;
  is_active: boolean;
  created_at: string;
  category: { id: string; name: string; slug: string } | null;
  primaryImage: string | null;
  variantCount: number;
}

interface CategoryOpt {
  id: string;
  name: string;
  slug: string;
}

type SortKey = 'newest' | 'name-asc' | 'name-desc' | 'price-low' | 'price-high';

interface ColorOpt {
  id: string;
  name: string;
  hex_code: string;
}

interface SizeOpt {
  id: string;
  name: string;
  sort_order: number;
}

/**
 * Shared variant adder: existing color dropdown + native color picker
 * with new-color creation + size dropdown + duplicate guard.
 * Used in both Add (pending state) and Edit (direct API) modes.
 */
function VariantAdder({
  colorOpts,
  sizeOpts,
  newColorId,
  newSizeId,
  pickerHex,
  newColorName,
  creatingColor,
  addingVariant,
  existingPairs,
  onColorChange,
  onSizeChange,
  onPickerChange,
  onNameChange,
  onCreateColor,
  onAdd,
  addLabel = '+ Add Variant',
}: {
  colorOpts: ColorOpt[];
  sizeOpts: SizeOpt[];
  newColorId: string;
  newSizeId: string;
  pickerHex: string;
  newColorName: string;
  creatingColor: boolean;
  addingVariant: boolean;
  existingPairs: { colorId: string; sizeId: string }[];
  onColorChange: (id: string) => void;
  onSizeChange: (id: string) => void;
  onPickerChange: (hex: string) => void;
  onNameChange: (name: string) => void;
  onCreateColor: () => void;
  onAdd: () => void;
  addLabel?: string;
}) {
  const duplicate =
    newColorId !== '' &&
    newSizeId !== '' &&
    existingPairs.some(
      (p) => p.colorId === newColorId && p.sizeId === newSizeId
    );
  const selectedColor = colorOpts.find((c) => c.id === newColorId) ?? null;

  return (
    <div className="variant-adder">
      <div className="admin-toolbar">
        <select
          aria-label="Color variant baru"
          value={newColorId}
          onChange={(e) => onColorChange(e.target.value)}
        >
          <option value="">— Color —</option>
          {colorOpts.map((c) => (
            <option key={c.id} value={c.id}>
              ● {c.name} ({c.hex_code})
            </option>
          ))}
        </select>
        <select
          aria-label="Size variant baru"
          value={newSizeId}
          onChange={(e) => onSizeChange(e.target.value)}
        >
          <option value="">— Size —</option>
          {sizeOpts.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="admin-mini-btn"
          onClick={onAdd}
          disabled={addingVariant || duplicate || !newColorId || !newSizeId}
          title={duplicate ? 'Kombinasi ini sudah ada' : 'Tambah variant'}
        >
          {addingVariant ? 'Adding...' : addLabel}
        </button>
      </div>
      {duplicate ? (
        <p className="pdp-hint" role="alert">
          Kombinasi color + size ini sudah ada di list.
        </p>
      ) : null}
      {selectedColor ? (
        <p className="admin-muted">
          <span
            className="cart-dot"
            style={{
              backgroundColor: selectedColor.hex_code,
              display: 'inline-block',
              marginRight: '.5rem',
            }}
            aria-hidden="true"
          />
          {selectedColor.name} · {selectedColor.hex_code}
        </p>
      ) : null}

      <details className="color-new">
        <summary>+ Warna baru (color picker)</summary>
        <div className="color-new-body">
          <label className="color-pick">
            <input
              type="color"
              value={pickerHex}
              onChange={(e) => onPickerChange(e.target.value.toUpperCase())}
              aria-label="Pilih warna"
            />
            <span className="color-preview" style={{ backgroundColor: pickerHex }} aria-hidden="true" />
            <code>{pickerHex.toUpperCase()}</code>
          </label>
          <label>
            <span>Color Name</span>
            <input
              type="text"
              value={newColorName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Navy"
            />
          </label>
          <button
            type="button"
            className="admin-mini-btn"
            onClick={onCreateColor}
            disabled={creatingColor}
          >
            {creatingColor ? 'Saving…' : 'Add Color'}
          </button>
        </div>
      </details>
    </div>
  );
}

/**
 * Kares Studio — Admin Products (client).
 * List + search/filter/sort + create/edit + active toggle + delete guard.
 * All writes via /api/admin/products (service role, server-side).
 */

/** Ritme baris agar kolom bercabang (size/stock/aksi) sejajar per varian. */
const VARIANT_ROW_H = 2.5; // rem
const variantLine: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  minHeight: `${VARIANT_ROW_H}rem`,
};

/** Kelompokkan varian berurutan berdasarkan kunci (mis. warna yang sama jadi 1 grup). */
function groupInto<V>(list: V[], keyOf: (v: V) => string): V[][] {
  const groups: { key: string; items: V[] }[] = [];
  for (const item of list) {
    const key = keyOf(item);
    const g = groups.find((x) => x.key === key);
    if (g) g.items.push(item);
    else groups.push({ key, items: [item] });
  }
  return groups.map((g) => g.items);
}
export default function AdminProductsClient({
  initialStatus,
  initialSearch,
  showNew,
}: {
  initialStatus: string;
  initialSearch: string;
  showNew: boolean;
}) {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<CategoryOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<
    (ConfirmDialogData & { action: () => void }) | null
  >(null);

  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState(initialStatus);
  const [catFilter, setCatFilter] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');

  const thumbUrl = (path: string | null) =>
    resolveImageUrlPublic(path, process.env.NEXT_PUBLIC_SUPABASE_URL);

  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [creating, setCreating] = useState(showNew);
  const [form, setForm] = useState({
    name: '',
    category_id: '',
    description: '',
    material: '',
    price: '',
    featured: false,
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  // Inline images inside the form (edit mode only — needs a product id).
  const [formImages, setFormImages] = useState<
    { id: string; image_url: string; sort_order: number }[]
  >([]);
  const [formImagesLoading, setFormImagesLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Variant manager inside the form (edit mode only). Reads/writes
  // product_variants directly — the same source Inventory reads.
  const [formVariants, setFormVariants] = useState<
    {
      id: string;
      color: { id: string; name: string; hex_code: string } | null;
      size: { id: string; name: string; sort_order: number } | null;
      stock: number;
    }[]
  >([]);
  const [formVariantsLoading, setFormVariantsLoading] = useState(false);
  const [colorOpts, setColorOpts] = useState<
    { id: string; name: string; hex_code: string }[]
  >([]);
  const [sizeOpts, setSizeOpts] = useState<
    { id: string; name: string; sort_order: number }[]
  >([]);
  const [newColorId, setNewColorId] = useState('');
  const [newSizeId, setNewSizeId] = useState('');
  const [addingVariant, setAddingVariant] = useState(false);

  // Color picker + create-color (shared by create & edit modes).
  const [pickerHex, setPickerHex] = useState('#1E3A5F');
  const [newColorName, setNewColorName] = useState('');
  const [creatingColor, setCreatingColor] = useState(false);

  // Pending variants for CREATE mode (no product_id yet — React state
  // only, sent as variants[] with the create request; never localStorage).
  const [pendingVariants, setPendingVariants] = useState<
    { colorId: string; colorName: string; hexCode: string; sizeId: string; sizeName: string }[]
  >([]);

  const refreshOptions = async () => {
    try {
      const res = await fetch('/api/admin/options', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) return;
      setColorOpts(data.colors ?? []);
      setSizeOpts(data.sizes ?? []);
    } catch {
      /* ignore */
    }
  };

  const createColor = async (): Promise<string | null> => {
    const name = newColorName.trim();
    const hex = pickerHex.trim().toUpperCase();
    if (!name) {
      setError('Isi nama warna baru (mis. Navy).');
      return null;
    }
    if (!/^#[0-9A-F]{6}$/.test(hex)) {
      setError('HEX harus format #RRGGBB.');
      return null;
    }
    // Reuse when the name already exists (case-insensitive).
    const existing = colorOpts.find(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) {
      setNewColorName('');
      return existing.id;
    }
    setCreatingColor(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/colors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, hex_code: hex }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Buat warna gagal.');
      const color = data.color as { id: string; name: string; hex_code: string };
      await refreshOptions();
      setNewColorName('');
      setNotice(
        data.reused
          ? `Warna "${color.name}" sudah ada — dipakai ulang.`
          : `Warna "${color.name}" (${color.hex_code}) dibuat.`
      );
      return color.id;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Buat warna gagal.');
      return null;
    } finally {
      setCreatingColor(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pRes, cRes] = await Promise.all([
        fetch('/api/admin/products', { cache: 'no-store' }),
        fetch('/api/admin/categories', { cache: 'no-store' }),
      ]);
      const pData = await pRes.json();
      const cData = await cRes.json();
      if (!pRes.ok) throw new Error(pData.error ?? 'Gagal memuat produk.');
      setRows(pData.products ?? []);
      setCategories(
        ((cData.categories ?? []) as CategoryOpt[]).map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
        }))
      );
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
    let list = rows.filter((p) => {
      if (q && !`${p.name} ${p.slug}`.toLowerCase().includes(q)) return false;
      if (status === 'active' && !p.is_active) return false;
      if (status === 'inactive' && p.is_active) return false;
      if (status === 'featured' && !p.featured) return false;
      if (catFilter && p.category?.id !== catFilter) return false;
      return true;
    });
    list = [...list];
    switch (sort) {
      case 'name-asc':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        list.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'price-low':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        list.sort((a, b) => b.price - a.price);
        break;
      default:
        list.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }
    return list;
  }, [rows, search, status, catFilter, sort]);

  const openEdit = (p: ProductRow) => {
    setEditing(p);
    setCreating(false);
    setForm({
      name: p.name,
      category_id: p.category?.id ?? '',
      description: '',
      material: '',
      price: String(p.price),
      featured: p.featured,
      is_active: p.is_active,
    });
    setNotice(null);
    void loadFormImages(p.id);
    void loadFormVariants(p.id);
    void loadOptions();
    setPendingVariants([]);
    setNewColorId('');
    setNewSizeId('');
    setNewColorName('');
  };

  const openCreate = () => {
    setEditing(null);
    setCreating(true);
    setFormImages([]);
    setFormVariants([]);
    setPendingVariants([]);
    setNewColorId('');
    setNewSizeId('');
    setNewColorName('');
    void loadOptions();
    setForm({
      name: '',
      category_id: '',
      description: '',
      material: '',
      price: '',
      featured: false,
      is_active: true,
    });
    setNotice(null);
  };

  const loadFormImages = async (productId: string) => {    setFormImagesLoading(true);
    try {
      const res = await fetch(
        `/api/admin/images?product_id=${encodeURIComponent(productId)}`,
        { cache: 'no-store' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Gagal memuat gambar.');
      setFormImages(data.images ?? []);
    } catch {
      setFormImages([]);
    } finally {
      setFormImagesLoading(false);
    }
  };

  const loadOptions = async () => {
    try {
      const res = await fetch('/api/admin/options', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Gagal memuat opsi.');
      setColorOpts(data.colors ?? []);
      setSizeOpts(data.sizes ?? []);
    } catch {
      /* options stay empty — variant add disabled with hint */
    }
  };

  const loadFormVariants = async (productId: string) => {
    setFormVariantsLoading(true);
    try {
      const res = await fetch(
        `/api/admin/variants?product_id=${encodeURIComponent(productId)}`,
        { cache: 'no-store' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Gagal memuat variant.');
      setFormVariants(data.variants ?? []);
    } catch {
      setFormVariants([]);
    } finally {
      setFormVariantsLoading(false);
    }
  };

  const addFormVariant = async () => {
    if (!editing || !newColorId || !newSizeId) {
      setError('Pilih color dan size untuk variant baru.');
      return;
    }
    setAddingVariant(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: editing.id,
          color_id: newColorId,
          size_id: newSizeId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Tambah variant gagal.');
      setNewColorId('');
      setNewSizeId('');
      setNotice('Variant ditambahkan — otomatis muncul di Inventory dengan stock 0.');
      await loadFormVariants(editing.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tambah variant gagal.');
    } finally {
      setAddingVariant(false);
    }
  };

  const variantLabel = (id: string) => {
    const target = formVariants.find((x) => x.id === id);
    return `${target?.color?.name ?? '?'} / ${target?.size?.name ?? '?'}`;
  };

  const askRemoveVariant = (id: string) => {
    setConfirm({
      title: 'Hapus Variant?',
      message: `Hapus variant ${variantLabel(id)}?`,
      confirmLabel: 'Ya, Hapus',
      danger: true,
      action: () => void doRemoveVariant(id),
    });
  };

  const doRemoveVariant = async (id: string) => {
    if (!editing) return;
    try {
      // Step 1: coba hapus; API melaporkan bila masih ada riwayat transaksi.
      let res = await fetch(
        `/api/admin/variants?id=${encodeURIComponent(id)}`,
        { method: 'DELETE' }
      );
      let data = (await res.json()) as {
        error?: string;
        transactions?: number;
        deletedTransactions?: number;
      };
      // Step 2: ada riwayat → konfirmasi hapus beserta riwayatnya.
      if (res.status === 409 && typeof data.transactions === 'number') {
        const count = data.transactions;
        setConfirm({
          title: 'Hapus Beserta Riwayat?',
          message: `Variant ${variantLabel(id)} memiliki ${count} transaksi inventory. Hapus variant BESERTA seluruh riwayat transaksinya?`,
          confirmLabel: 'Ya, Hapus Semua',
          danger: true,
          action: () => void doRemoveVariantConfirmed(id),
        });
        return;
      }
      if (!res.ok) throw new Error(data.error ?? 'Hapus variant gagal.');
      setNotice(
        `Variant ${variantLabel(id)} dihapus.` +
          (data.deletedTransactions
            ? ` (${data.deletedTransactions} riwayat transaksi ikut dihapus.)`
            : '')
      );
      await loadFormVariants(editing.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hapus variant gagal.');
    }
  };

  const doRemoveVariantConfirmed = async (id: string) => {
    if (!editing) return;
    try {
      const res = await fetch(
        `/api/admin/variants?id=${encodeURIComponent(id)}&confirm=1`,
        { method: 'DELETE' }
      );
      const data = (await res.json()) as {
        error?: string;
        deletedTransactions?: number;
      };
      if (!res.ok) throw new Error(data.error ?? 'Hapus variant gagal.');
      setNotice(
        `Variant ${variantLabel(id)} dihapus.` +
          (data.deletedTransactions
            ? ` (${data.deletedTransactions} riwayat transaksi ikut dihapus.)`
            : '')
      );
      await loadFormVariants(editing.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hapus variant gagal.');
    }
  };

  /** Pending variant for CREATE mode (React state only). */
  const addPendingVariant = () => {
    if (!newColorId || !newSizeId) {
      setError('Pilih color dan size untuk variant baru.');
      return;
    }
    if (
      pendingVariants.some(
        (v) => v.colorId === newColorId && v.sizeId === newSizeId
      )
    ) {
      setError('Kombinasi color + size ini sudah ada di list.');
      return;
    }
    const color = colorOpts.find((c) => c.id === newColorId);
    const size = sizeOpts.find((s) => s.id === newSizeId);
    if (!color || !size) {
      setError('Color/size tidak valid.');
      return;
    }
    setPendingVariants((prev) => [
      ...prev,
      {
        colorId: color.id,
        colorName: color.name,
        hexCode: color.hex_code,
        sizeId: size.id,
        sizeName: size.name,
      },
    ]);
    setNewColorId('');
    setNewSizeId('');
    setError(null);
  };

  const removePendingVariant = (colorId: string, sizeId: string) => {
    setPendingVariants((prev) =>
      prev.filter((v) => !(v.colorId === colorId && v.sizeId === sizeId))
    );
  };

  const uploadFormImage = async (file: File) => {
    if (!editing) return;
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      setError('File harus gambar ≤ 5 MB.');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('product_id', editing.id);
      fd.append('file', file);
      const res = await fetch('/api/admin/images', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload gagal.');
      await loadFormImages(editing.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload gagal.');
    } finally {
      setUploading(false);
    }
  };

  const askRemoveFormImage = (id: string, index: number) => {
    if (!editing) return;
    setConfirm({
      title: 'Hapus Gambar?',
      message: `Gambar #${index + 1} akan dihapus permanen dari produk ini.`,
      confirmLabel: 'Ya, Hapus',
      danger: true,
      action: () => void removeFormImage(id),
    });
  };

  const removeFormImage = async (id: string) => {
    if (!editing) return;
    try {
      const res = await fetch(`/api/admin/images?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Hapus gagal.');
      await loadFormImages(editing.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hapus gagal.');
    }
  };

  const moveFormImage = async (index: number, dir: -1 | 1) => {
    if (!editing) return;
    const next = [...formImages];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setFormImages(next);
    try {
      const res = await fetch('/api/admin/images', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: next.map((img, i) => ({ id: img.id, sort_order: i + 1 })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Reorder gagal.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reorder gagal.');
      await loadFormImages(editing.id);
    }
  };

  const submit = async () => {
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      const payload = {
        ...(editing ? { id: editing.id } : {}),
        name: form.name.trim(),
        category_id: form.category_id || null,
        description: form.description.trim() || null,
        material: form.material.trim() || null,
        price: Number(form.price),
        featured: form.featured,
        is_active: form.is_active,
        // Pending variants (create mode) — server dedupes by color+size.
        ...(!editing && pendingVariants.length > 0
          ? {
              variants: pendingVariants.map((v) => ({
                color_id: v.colorId,
                size_id: v.sizeId,
              })),
            }
          : {}),
      };
      const res = await fetch('/api/admin/products', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Simpan gagal.');
      setNotice(editing ? 'Produk diperbarui.' : `Produk dibuat (slug: ${(data.product as { slug: string }).slug}).`);
      setEditing(null);
      setCreating(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Simpan gagal.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: ProductRow) => {
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, is_active: !p.is_active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Toggle gagal.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Toggle gagal.');
    }
  };

  const remove = async (p: ProductRow) => {
    // Step 1: fetch impact summary for an informed confirmation.
    let impact: {
      variants: number;
      images: number;
      transactions: number;
      storageFiles: number;
    } | null = null;
    try {
      const res = await fetch(
        `/api/admin/products?id=${encodeURIComponent(p.id)}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Hapus gagal.');
      impact = data.impact ?? null;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hapus gagal.');
      return;
    }
    const summary = impact
      ? ` (${impact.variants} variant, ${impact.images} gambar, ${impact.transactions} transaksi inventory, ${impact.storageFiles} file Storage)`
      : '';
    // Step 2: designed confirmation with impact summary.
    setConfirm({
      title: 'Hapus Produk Permanen?',
      message: `Semua data product, variant, inventory terkait, dan gambar di Supabase Storage akan dihapus secara permanen.${summary}`,
      confirmLabel: 'Ya, Hapus Permanen',
      danger: true,
      action: () => void doRemoveConfirmed(p),
    });
  };

  const doRemoveConfirmed = async (p: ProductRow) => {
    try {
      const res = await fetch(
        `/api/admin/products?id=${encodeURIComponent(p.id)}&confirm=1`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Hapus gagal.');
      const d = data.deleted as
        | { variants: number; images: number; transactions: number; storageFiles: number }
        | undefined;
      setNotice(
        `"${p.name}" dihapus permanen.` +
          (d ? ` (${d.variants} variant, ${d.images} gambar, ${d.transactions} transaksi, ${d.storageFiles} file Storage dibersihkan.)` : '')
      );
      if (editing?.id === p.id) {
        setEditing(null);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hapus gagal.');
    }
  };

  return (
    <AdminShell title="Products">
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
          aria-label="Cari produk"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Filter status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Semua status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="featured">Featured</option>
        </select>
        <select
          aria-label="Filter kategori"
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
        >
          <option value="">Semua kategori</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Urutkan"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
        >
          <option value="newest">Terbaru</option>
          <option value="name-asc">Nama A-Z</option>
          <option value="name-desc">Nama Z-A</option>
          <option value="price-low">Harga terendah</option>
          <option value="price-high">Harga tertinggi</option>
        </select>
        <button type="button" className="btn-primary" onClick={openCreate}>
          + Add Product
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

      {(creating || editing) && (
        <section className="admin-panel" aria-label={editing ? 'Edit product' : 'Add product'}>
          <h2>{editing ? `Edit — ${editing.name}` : 'Add Product'}</h2>
          <div className="admin-form">
            <h3 className="admin-section-title">A. Product Information</h3>
            <label>
              <span>Product Name *</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Basic Oversized T-Shirt"
              />
            </label>
            <label>
              <span>Category *</span>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              >
                <option value="">— Pilih kategori —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Price (Rp) *</span>
              <input
                type="text"
                inputMode="numeric"
                value={form.price}
                onChange={(e) =>
                  setForm({ ...form, price: e.target.value.replace(/[^0-9]/g, '') })
                }
                placeholder="195000"
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
              <span>Material</span>
              <input
                type="text"
                value={form.material}
                onChange={(e) => setForm({ ...form, material: e.target.value })}
              />
            </label>
            <label className="admin-check">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => setForm({ ...form, featured: e.target.checked })}
              />
              <span>Featured (tampil di homepage)</span>
            </label>
            <label className="admin-check">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              <span>Active (tampil di storefront)</span>
            </label>
            <h3 className="admin-section-title">B. Product Images</h3>
            {editing ? (
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
                  Product Images (kiri = utama)
                </span>
                {formImagesLoading ? (
                  <p className="admin-muted">Memuat gambar…</p>
                ) : (
                  <div className="admin-img-row">
                    {formImages.map((img, i) => (
                      <div
                        key={img.id}
                        className="admin-img-cell"
                        title={`#${img.sort_order}`}
                      >
                        {thumbUrl(img.image_url) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumbUrl(img.image_url) as string}
                            alt={`Product image ${i + 1}`}
                            loading="lazy"
                          />
                        ) : null}
                        <button
                          type="button"
                          onClick={() => askRemoveFormImage(img.id, i)}
                          aria-label={`Delete image ${i + 1}`}
                        >
                          ×
                        </button>
                        <span style={{ position: 'absolute', bottom: '.25rem', left: '.25rem', display: 'flex', gap: '.25rem' }}>
                          <button type="button" onClick={() => void moveFormImage(i, -1)} disabled={i === 0} aria-label="Move left" style={{ position: 'static' }}>
                            ‹
                          </button>
                          <button type="button" onClick={() => void moveFormImage(i, 1)} disabled={i === formImages.length - 1} aria-label="Move right" style={{ position: 'static' }}>
                            ›
                          </button>
                        </span>
                      </div>
                    ))}
                    <label className="admin-mini-btn" style={{ alignSelf: 'center' }}>
                      {uploading ? 'Uploading…' : '+ Upload'}
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        disabled={uploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void uploadFormImage(f);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>
            ) : (
              <p className="admin-muted">
                Upload gambar tersedia setelah produk dibuat (klik Edit).
              </p>
            )}
            <h3 className="admin-section-title">C. Variants</h3>
            {editing ? (
              <div>
                {formVariantsLoading ? (
                  <p className="admin-muted">Memuat variant...</p>
                ) : (
                  <>
                    {formVariants.length > 0 ? (
                      <div className="admin-table-wrap" style={{ marginBottom: '.75rem' }}>
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Color</th>
                              <th>Size</th>
                              <th style={{ textAlign: 'center' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {groupInto(formVariants, (v) => v.color?.id ?? v.id).map(
                              (items) => {
                                const color = items[0]?.color ?? null;
                                return (
                                  <tr key={items[0]?.id ?? ''}>
                                    <td>
                                      <span
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          minHeight: `${items.length * VARIANT_ROW_H}rem`,
                                        }}
                                      >
                                        <span>
                                          <span
                                            className="cart-dot"
                                            style={{
                                              backgroundColor: color?.hex_code ?? 'var(--border)',
                                              display: 'inline-block',
                                              marginRight: '.5rem',
                                            }}
                                            aria-hidden="true"
                                          />
                                          {color?.name ?? '?'}
                                          <br />
                                          <span style={{ color: 'var(--muted)', fontSize: 11 }}>
                                            {color?.hex_code ?? ''}
                                          </span>
                                        </span>
                                      </span>
                                    </td>
                                    <td>
                                      {items.map((v) => (
                                        <span key={v.id} style={variantLine}>
                                          {v.size?.name ?? '?'}
                                        </span>
                                      ))}
                                    </td>
                                    <td>
                                      {items.map((v) => (
                                        <span
                                          key={v.id}
                                          style={{ ...variantLine, justifyContent: 'center' }}
                                        >
                                          <button
                                            type="button"
                                            className="admin-mini-btn danger"
                                            onClick={() => askRemoveVariant(v.id)}
                                            aria-label={`Delete variant ${v.color?.name} ${v.size?.name}`}
                                          >
                                            Delete
                                          </button>
                                        </span>
                                      ))}
                                    </td>
                                  </tr>
                                );
                              }
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="admin-muted" style={{ marginBottom: '.75rem' }}>
                        Belum ada variant — tambahkan di bawah. Stock awal 0
                        (Out of Stock); isi via Inventory → Stock In.
                      </p>
                    )}
                    <VariantAdder
                      colorOpts={colorOpts}
                      sizeOpts={sizeOpts}
                      newColorId={newColorId}
                      newSizeId={newSizeId}
                      pickerHex={pickerHex}
                      newColorName={newColorName}
                      creatingColor={creatingColor}
                      addingVariant={addingVariant}
                      existingPairs={formVariants.map((v) => ({
                        colorId: v.color?.id ?? '',
                        sizeId: v.size?.id ?? '',
                      }))}
                      onColorChange={setNewColorId}
                      onSizeChange={setNewSizeId}
                      onPickerChange={setPickerHex}
                      onNameChange={setNewColorName}
                      onCreateColor={async () => {
                        const id = await createColor();
                        if (id) setNewColorId(id);
                      }}
                      onAdd={() => void addFormVariant()}
                    />
                  </>
                )}
              </div>
            ) : (
              <div>
                {pendingVariants.length > 0 ? (
                  <div className="admin-table-wrap" style={{ marginBottom: '.75rem' }}>
                    <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Color</th>
                              <th>Size</th>
                              <th style={{ textAlign: 'center' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {groupInto(pendingVariants, (v) => v.colorId).map(
                              (items) => (
                                <tr key={items[0]?.colorId ?? ''}>
                                  <td>
                                    <span
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        minHeight: `${items.length * VARIANT_ROW_H}rem`,
                                      }}
                                    >
                                      <span>
                                        <span
                                          className="cart-dot"
                                          style={{
                                            backgroundColor: items[0]?.hexCode,
                                            display: 'inline-block',
                                            marginRight: '.5rem',
                                          }}
                                          aria-hidden="true"
                                        />
                                        {items[0]?.colorName}
                                        <br />
                                        <span style={{ color: 'var(--muted)', fontSize: 11 }}>
                                          {items[0]?.hexCode}
                                        </span>
                                      </span>
                                    </span>
                                  </td>
                                  <td>
                                    {items.map((v) => (
                                      <span
                                        key={`${v.colorId}:${v.sizeId}`}
                                        style={variantLine}
                                      >
                                        {v.sizeName}
                                      </span>
                                    ))}
                                  </td>
                                  <td>
                                    {items.map((v) => (
                                      <span
                                        key={`${v.colorId}:${v.sizeId}`}
                                        style={{ ...variantLine, justifyContent: 'center' }}
                                      >
                                        <button
                                          type="button"
                                          className="admin-mini-btn danger"
                                          onClick={() =>
                                            removePendingVariant(v.colorId, v.sizeId)
                                          }
                                        >
                                          Hapus
                                        </button>
                                      </span>
                                    ))}
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="admin-muted" style={{ marginBottom: '.75rem' }}>
                    Belum ada variant — tambahkan di bawah. Tersimpan saat
                    produk dibuat.
                  </p>
                )}
                <VariantAdder
                  colorOpts={colorOpts}
                  sizeOpts={sizeOpts}
                  newColorId={newColorId}
                  newSizeId={newSizeId}
                  pickerHex={pickerHex}
                  newColorName={newColorName}
                  creatingColor={creatingColor}
                  addingVariant={false}
                  existingPairs={pendingVariants}
                  onColorChange={setNewColorId}
                  onSizeChange={setNewSizeId}
                  onPickerChange={setPickerHex}
                  onNameChange={setNewColorName}
                  onCreateColor={async () => {
                    const id = await createColor();
                    if (id) setNewColorId(id);
                  }}
                  onAdd={addPendingVariant}
                  addLabel="+ Tambah Variant"
                />
              </div>
            )}
            <div className="admin-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => void submit()}
                disabled={saving}
              >
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Product'}
              </button>
              <button
                type="button"
                className="btn-outline"
                onClick={() => {
                  setEditing(null);
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
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Status</th>
              <th>Variants</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6}>Memuat produk…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6}>Tidak ada produk yang cocok.</td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
                      <span className="admin-thumb" aria-hidden="true">
                        {thumbUrl(p.primaryImage) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumbUrl(p.primaryImage) as string} alt="" loading="lazy" />
                        ) : null}
                      </span>
                      <span>
                        <strong>{p.name}</strong>
                        <br />
                        <span style={{ color: 'var(--muted)', fontSize: 11 }}>
                          /{p.slug}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td>{p.category?.name ?? '—'}</td>
                  <td>{formatIDR(p.price)}</td>
                  <td>
                    <span className={`admin-pill ${p.is_active ? 'on' : 'off'}`}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>{' '}
                    {p.featured ? (
                      <span className="admin-pill feat">Featured</span>
                    ) : null}
                  </td>
                  <td>{p.variantCount}</td>
                  <td>
                    <div className="admin-row-actions">
                      <button
                        type="button"
                        className="admin-mini-btn"
                        onClick={() => openEdit(p)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="admin-mini-btn"
                        onClick={() => void toggleActive(p)}
                      >
                        {p.is_active ? 'Nonaktif' : 'Aktifkan'}
                      </button>
                      <button
                        type="button"
                        className="admin-mini-btn danger"
                        onClick={() => void remove(p)}
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
