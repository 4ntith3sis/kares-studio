# Kares Studio — Fashion E-Commerce Platform & Admin CMS

Next.js 14 + TypeScript + App Router + Supabase fashion e-commerce platform & CMS.

---

## 🚀 Overview

**Kares Studio** adalah platform e-commerce dan katalog fashion modern yang responsif dan berestetika tinggi. Proyek ini mengintegrasikan tampilan publik (**Storefront**) dengan **Dashboard Admin & CMS** untuk pengelolaan produk, varian (warna & ukuran), kategori, transaksi inventaris real-time, serta penyesuaian konten beranda secara langsung. Pemesanan produk terintegrasi langsung melalui WhatsApp Checkout dengan validasi stok real-time.

---

## 🛠️ Teknologi & Arsitektur

- **Frontend**: Next.js 14 (App Router), TypeScript, React 18, Custom Vanilla CSS Design System.
- **Backend & Database**: Supabase (PostgreSQL, Row Level Security / RLS, Storage Buckets, Database Triggers & Functions).
- **Authentication & Security**: Supabase Auth (`@supabase/ssr`), Middleware Cookie Refresh, Service Role Key (server-only).
- **State & Sync**: LocalStorage (Cart), Synchronized URL Query Params (Collection Filter & Search).
- **Ordering Channel**: Direct WhatsApp Integration (`https://wa.me/`) dengan validasi ketersediaan stok real-time.

---

## ✨ Fitur Utama

### 🛒 Storefront Publik
- **Beranda Interaktif (`/`)**:
  - Hero section, Brand Statement, Grid Kategori, New Arrivals (Featured Products), Quality Promise, Manifesto, Customer Assistance, dan Footer.
  - Seluruh teks dan gambar pada section ini dikontrol secara dinamis via Admin CMS (`homepage_content`).
- **Katalog Collection (`/collection`)**:
  - In-memory explorer dengan filter berdasarkan kategori, rentang harga, kata kunci pencarian, dan pengurutan harga/terbaru.
  - Sinkronisasi state filter dengan query parameter URL untuk sharing & bookmarking.
- **Halaman Detail Produk / PDP (`/product/[slug]`)**:
  - Galeri thumbnail gambar produk.
  - Pemilih varian (warna & ukuran) dengan indikator stok aktual (`IN - OUT`).
  - Breadcrumbs navigasi & rekomendasi produk serupa.
- **Keranjang & WhatsApp Checkout (`/cart`)**:
  - Manajemen keranjang belanja berbasis LocalStorage.
  - Validasi stok real-time dari Supabase DB sebelum checkout via API (`/api/cart/validate`).
  - Format pesan pemesanan otomatis ter-encode aman untuk dikirim ke WhatsApp toko.
- **Halaman Informasi (`/about`, `/contact`)**:
  - Halaman tentang brand dan kontak customer service.

### 🛡️ Dashboard Admin & CMS (`/admin`)
- **Autentikasi Admin (`/admin/login`)**:
  - Proteksi halaman & API route berbasis Supabase Auth session token.
- **Overview Dashboard (`/admin`)**:
  - Ringkasan statistik total produk aktif, total kategori, transaksi stok, dan shortcut manajemen.
- **Manajemen Produk & Varian (`/admin/products`)**:
  - Tambah, edit, aktifkan/nonaktifkan (*soft hide*) produk.
  - Kelola varian produk (kombinasi warna, ukuran, SKU, harga khusus per varian).
  - Upload gambar produk langsung ke public bucket Supabase Storage (`product-images`).
- **Manajemen Kategori (`/admin/categories`)**:
  - Tambah, edit, dan atur kategori fashion beserta gambar cover.
- **Kontrol Inventaris Real-Time (`/admin/inventory`)**:
  - Catat transaksi stok masuk (`IN`) dan stok keluar (`OUT`) dengan catatan/nomor referensi.
  - Riwayat mutasi stok dan pemantauan stok aktual per varian.
- **Content Management System / CMS Beranda (`/admin/cms`)**:
  - Sunting teks (eyebrow, title, description, badge, quote) dan gambar untuk seluruh section beranda secara real-time.

---

## 🔒 Aturan Bisnis & Integrasi Database (Supabase PostgreSQL)

1. **Calculated Stock Only (No Editable Stock Column)**:
   - Stok tidak disimpan dalam kolom statis, melainkan dihitung secara dinamis: `stock = SUM(in) - SUM(out)` via view `variant_stock` & function `get_variant_stock()`.
2. **Race-Safe Inventory Guard**:
   - Transaksi `OUT` yang dapat menyebabkan stok menjadi negatif secara otomatis ditolak oleh DB trigger (`guard_inventory_stock`) dengan row locking (`FOR UPDATE`).
3. **Automated Unique Slugs**:
   - Slug produk dan kategori di-generate otomatis dari nama via DB trigger (`product_slug_trg`, `category_slug_trg`) dan dijamin unik per tabel.
4. **Unique Variant Combination**:
   - Kombinasi `(product_id, color_id, size_id)` pada tabel `product_variants` bersifat `UNIQUE`.
5. **Row Level Security (RLS) & Security Policies**:
   - Tabel katalog & CMS terbuka publik untuk dibaca (`public read` / anon key).
   - Tabel transaksi inventaris tidak memiliki akses anonim (`no anon access`).
   - Penulisan admin dilindungi melalui API route terproteksi yang mengeksekusi query aman di sisi server.

---

## 📍 Navigasi & Status Route

| Route | Fungsi & Status |
|---|---|
| `/` | Beranda utama dengan konten dinamis dari CMS |
| `/collection` | Katalog lengkap dengan filter, pencarian, dan sorting |
| `/product/[slug]` | Detail produk (PDP), pemilih varian, dan rekomendasi |
| `/cart` | Keranjang belanja & WhatsApp Checkout dengan validasi stok |
| `/about`, `/contact` | Halaman profil brand & bantuan kontak |
| `/admin` | Dashboard Admin overview |
| `/admin/login` | Portal login autentikasi admin |
| `/admin/products` | Manajemen katalog produk, varian, dan galeri foto |
| `/admin/categories` | Manajemen kategori produk |
| `/admin/inventory` | Transaksi stok `IN` / `OUT` & riwayat mutasi |
| `/admin/cms` | Pengaturan konten & media beranda (CMS) |

---

## ⚙️ Variabel Lingkungan (`.env.local`)

Salin file `.env.example` menjadi `.env.local` dan lengkapi variabel berikut:

| Variabel | Lingkup | Deskripsi |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client & Server | URL project Supabase Anda |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client & Server | Anon/Public Key Supabase untuk query RLS publik |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server Only** | Service Role Key Supabase untuk seeding & operasi admin server-side |
| `NEXT_PUBLIC_SITE_NAME` | Client & Server | Nama toko/aplikasi (default: `Kares Studio`) |
| `NEXT_PUBLIC_SITE_URL` | Client & Server | URL publik aplikasi (default: `http://localhost:3000`) |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Client & Server | Nomor WhatsApp tujuan checkout (format internasional tanpa `+`, cth: `6281234567890`) |

---

## 🚀 Perintah & Cara Menjalankan

### 1. Instalasi Dependensi

```bash
npm install
```

### 2. Setup Supabase Database

1. Eksekusi script migrasi berikut secara berurutan di **Supabase SQL Editor**:
   - `supabase/migrations/0001_phase1_schema.sql` (Skema awal, tabel katalog, inventaris, view, trigger, RLS, & bucket Storage).
   - `supabase/migrations/0002_phase6_admin_cms.sql` (Tabel `homepage_content` & status `is_active` produk).
2. Buat public bucket di Supabase Storage bernama `product-images` (bila belum terbuat otomatis oleh SQL).

### 3. Seed Data Awal

Pastikan `NEXT_PUBLIC_SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` telah terisi di `.env.local`:

```bash
npx tsx scripts/seed.ts
```

*Atau untuk verifikasi query skema database:*
Gunakan script `supabase/verify_phase1.sql` di SQL Editor Supabase.

### 4. Jalankan Perintah Pengembangan & Build

```bash
# Server Pengembangan (Development Mode)
npm run dev

# Pemeriksaan Kualitas Kode (TypeScript & Lint)
npm run typecheck
npm run lint

# Kompilasi Production Build
npm run build

# Menjalankan Mode Production
npm run start
```
