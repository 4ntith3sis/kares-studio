'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import CardImage from '@/components/home/CardImage';
import { formatIDR } from '@/lib/utils/format';
import {
  COLLECTION_SORT_OPTIONS,
  filterAndSortProducts,
  parsePriceParam,
  parseSortParam,
} from '@/lib/collection-filters';
import type { CollectionProduct } from '@/services/collection';
import type { Category } from '@/types';

type Props = {
  products: CollectionProduct[];
  categories: Category[];
};

const SEARCH_DEBOUNCE_MS = 400;
const PRICE_DEBOUNCE_MS = 500;

function getParam(params: URLSearchParams, key: string): string {
  return params.get(key) ?? '';
}

/**
 * Kares Studio — Phase 3 collection explorer (client).
 *
 * Single server fetch (props); category + price + search + sort all run
 * in memory via filterAndSortProducts. State lives in URL query params
 * (?category=&search=&min=&max=&sort=) so filters survive refresh/share.
 * Search/price inputs are debounced; category/sort commit instantly.
 * Cards reuse the homepage product card language and link to
 * /product/[slug] using the DB slug.
 */
export default function CollectionExplorer({
  products,
  categories,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const categorySlug = getParam(searchParams, 'category');
  const search = getParam(searchParams, 'search');
  const minRaw = searchParams.has('min') ? getParam(searchParams, 'min') : '';
  const maxRaw = searchParams.has('max') ? getParam(searchParams, 'max') : '';
  const sort = parseSortParam(searchParams.get('sort'));

  const validSlugs = useMemo(
    () => new Set(categories.map((c) => c.slug)),
    [categories]
  );
  const activeCategory = validSlugs.has(categorySlug) ? categorySlug : '';

  const commit = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') next.delete(key);
        else next.set(key, value);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // Search input (debounced → URL).
  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => {
    setSearchInput(search);
  }, [search]);
  useEffect(() => {
    if (searchInput === search) return;
    const t = setTimeout(
      () => commit({ search: searchInput.trim() || null }),
      SEARCH_DEBOUNCE_MS
    );
    return () => clearTimeout(t);
  }, [searchInput, search, commit]);

  // Price inputs (debounced → URL, digits only).
  const [minInput, setMinInput] = useState(minRaw);
  const [maxInput, setMaxInput] = useState(maxRaw);
  useEffect(() => {
    setMinInput(minRaw);
  }, [minRaw]);
  useEffect(() => {
    setMaxInput(maxRaw);
  }, [maxRaw]);
  useEffect(() => {
    if (minInput === minRaw && maxInput === maxRaw) return;
    const t = setTimeout(() => {
      const min = parsePriceParam(minInput || null);
      const max = parsePriceParam(maxInput || null);
      if (
        (minInput && min === null && minInput.trim() !== '') ||
        (maxInput && max === null && maxInput.trim() !== '')
      ) {
        setMinInput(minRaw);
        setMaxInput(maxRaw);
        return;
      }
      commit({
        min: min === null ? null : String(min),
        max: max === null ? null : String(max),
      });
    }, PRICE_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [minInput, maxInput, minRaw, maxRaw, commit]);

  // Mobile filter panel.
  const [filtersOpen, setFiltersOpen] = useState(false);

  const countByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      if (!p.categorySlug) continue;
      map.set(p.categorySlug, (map.get(p.categorySlug) ?? 0) + 1);
    }
    return map;
  }, [products]);

  const priceBounds = useMemo(() => {
    if (products.length === 0) return { min: 0, max: 0 };
    let lo = products[0].price;
    let hi = products[0].price;
    for (const p of products) {
      if (p.price < lo) lo = p.price;
      if (p.price > hi) hi = p.price;
    }
    return { min: lo, max: hi };
  }, [products]);

  const results = useMemo(
    () =>
      filterAndSortProducts(products, {
        categorySlug: activeCategory,
        search,
        minPrice: parsePriceParam(minRaw || null),
        maxPrice: parsePriceParam(maxRaw || null),
        sort,
      }),
    [products, activeCategory, search, minRaw, maxRaw, sort]
  );

  const hasActiveFilters =
    activeCategory !== '' ||
    search.trim() !== '' ||
    minRaw !== '' ||
    maxRaw !== '';
  const activeFilterCount =
    (activeCategory ? 1 : 0) +
    (search.trim() ? 1 : 0) +
    (minRaw || maxRaw ? 1 : 0);

  const resetFilters = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  const filterPanel = (
    <>
      <div className="filter-group">
        <span className="filter-label">[SEARCH]</span>
        <input
          className="filter-search"
          type="search"
          placeholder="Cari produk…"
          aria-label="Cari produk berdasarkan nama"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      <div className="filter-group">
        <span className="filter-label">[CATEGORY]</span>
        <div className="coll-list">
          <button
            type="button"
            className={`coll-item${activeCategory === '' ? ' active' : ''}`}
            onClick={() => commit({ category: null })}
            aria-pressed={activeCategory === ''}
          >
            <span className="coll-item-left">
              <span className="coll-name">Semua Produk</span>
            </span>
            <span className="coll-year">{products.length}</span>
          </button>
          {categories.map((c) => (
            <button
              type="button"
              key={c.slug || c.id}
              className={`coll-item${activeCategory === c.slug ? ' active' : ''}`}
              onClick={() => commit({ category: c.slug })}
              aria-pressed={activeCategory === c.slug}
            >
              <span className="coll-item-left">
                <span className="coll-name">{c.name}</span>
              </span>
              <span className="coll-year">
                {countByCategory.get(c.slug) ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <span className="filter-label">[PRICE]</span>
        <div className="price-row">
          <label>
            <span>Min</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder={String(priceBounds.min)}
              aria-label="Harga minimum"
              value={minInput}
              onChange={(e) =>
                setMinInput(e.target.value.replace(/[^0-9]/g, ''))
              }
            />
          </label>
          <span className="price-sep">–</span>
          <label>
            <span>Max</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder={String(priceBounds.max)}
              aria-label="Harga maksimum"
              value={maxInput}
              onChange={(e) =>
                setMaxInput(e.target.value.replace(/[^0-9]/g, ''))
              }
            />
          </label>
        </div>
        <p className="filter-hint">Dalam Rupiah (Rp).</p>
      </div>

      {hasActiveFilters ? (
        <button type="button" className="btn-outline" onClick={resetFilters}>
          Reset Filter
        </button>
      ) : null}
    </>
  );

  return (
    <>
      <div className="shop-toolbar">
        <button
          type="button"
          className="shop-filter-toggle"
          onClick={() => setFiltersOpen((v) => !v)}
          aria-expanded={filtersOpen}
        >
          {filtersOpen ? 'Tutup Filter' : 'Filter'}
          {activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <p className="shop-count" aria-live="polite">
          {results.length} produk
          {activeCategory
            ? ` — ${categories.find((c) => c.slug === activeCategory)?.name ?? activeCategory}`
            : null}
        </p>
        <label className="shop-sort">
          <span>Urutkan</span>
          <select
            aria-label="Urutkan produk"
            value={sort}
            onChange={(e) => commit({ sort: e.target.value })}
          >
            {COLLECTION_SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="shop-layout">
        <aside
          className={`shop-sidebar${filtersOpen ? ' open' : ''}`}
          aria-label="Filter koleksi"
        >
          {filterPanel}
        </aside>

        <div>
          {results.length === 0 ? (
            <div className="shop-state shop-state-inline">
              <div className="section-tag" style={{ justifyContent: 'center' }}>
                <span className="star">✹</span>
                <span className="label">[NO RESULTS]</span>
              </div>
              <h2>Tidak ada produk yang cocok</h2>
              <p>
                Coba ubah kata kunci, rentang harga, atau kategori yang
                dipilih.
              </p>
              <div className="shop-state-actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={resetFilters}
                >
                  Reset Filter
                </button>
              </div>
            </div>
          ) : (
            <div className="shop-grid">
              {results.map((p) => (
                <Link
                  href={`/product/${p.slug}`}
                  className="prod-card shop-card"
                  key={p.slug || p.id}
                  aria-label={`View ${p.name}`}
                >
                  <div className="prod-img">
                    {p.imageSrc ? (
                      <CardImage
                        src={p.imageSrc}
                        alt={`Kares Studio ${p.name}`}
                      />
                    ) : (
                      <div className="ph">[PRODUCT]</div>
                    )}
                  </div>
                  <div className="prod-info">
                    <p className="prod-name">{p.name}</p>
                    <p className="prod-price">{formatIDR(p.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
