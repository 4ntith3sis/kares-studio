'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import CardImage from '@/components/home/CardImage';
import { useCart } from '@/components/cart/CartStore';
import { formatIDR } from '@/lib/utils/format';
import {
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  getStoreWhatsappNumber,
  isValidCustomerWhatsapp,
  normalizeCustomerWhatsapp,
  validateCartStock,
  type StockMap,
} from '@/lib/cart';

type ValidateIssue = {
  variantId: string;
  available: number;
  requested: number;
  kind: 'soldout' | 'exceeds' | 'missing';
};

const ISSUE_TEXT: Record<ValidateIssue['kind'], string> = {
  soldout: 'Sold Out — stok habis',
  exceeds: 'melebihi stok tersedia',
  missing: 'varian tidak lagi tersedia',
};

/**
 * Kares Studio — Phase 5 Cart page (client).
 *
 * List + qty ±1 (min 1, max = fresh stock) + remove + summary +
 * checkout form (nama, no. WA, catatan) + order review + WhatsApp
 * redirect. Stock re-validated server-side before checkout; checkout
 * blocked until every issue is resolved.
 */
export default function CartPageClient() {
  const { items, subtotal, setQuantity, removeItem } = useCart();
  const [stocks, setStocks] = useState<StockMap>(new Map());
  const [stockState, setStockState] = useState<'idle' | 'loading' | 'error'>(
    'idle'
  );
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [note, setNote] = useState('');
  const [formTouched, setFormTouched] = useState(false);
  const [checkoutMsg, setCheckoutMsg] = useState<string | null>(null);

  const refreshStocks = useCallback(async () => {
    if (items.length === 0) {
      setStocks(new Map());
      setStockState('idle');
      return;
    }
    setStockState('loading');
    try {
      const res = await fetch('/api/cart/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
          })),
        }),
      });
      const data = (await res.json()) as {
        stocks?: Record<string, number>;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? 'Validasi stok gagal.');
      setStocks(
        new Map(
          Object.entries(data.stocks ?? {}).map(([k, v]) => [k, Number(v) || 0])
        )
      );
      setStockState('idle');
    } catch {
      setStockState('error');
    }
  }, [items]);

  useEffect(() => {
    void refreshStocks();
  }, [refreshStocks]);

  const issues = useMemo(
    () => validateCartStock(items, stocks),
    [items, stocks]
  );
  const issueByVariant = useMemo(
    () => new Map(issues.map((i) => [i.variantId, i])),
    [issues]
  );

  const clampToStock = useCallback(
    (variantId: string) => {
      const available = stocks.get(variantId);
      if (available !== undefined && available > 0) {
        setQuantity(variantId, available);
      }
    },
    [stocks, setQuantity]
  );

  const count = items.reduce((n, i) => n + i.quantity, 0);
  const nameOk = name.trim().length >= 2;
  const waOk = isValidCustomerWhatsapp(whatsapp);
  const canCheckout =
    items.length > 0 &&
    stockState !== 'loading' &&
    stockState !== 'error' &&
    issues.length === 0 &&
    nameOk &&
    waOk;

  const handleCheckout = () => {
    setFormTouched(true);
    setCheckoutMsg(null);
    if (items.length === 0) {
      setCheckoutMsg('Cart masih kosong.');
      return;
    }
    if (stockState === 'error' || stockState === 'loading') {
      setCheckoutMsg('Stok belum tervalidasi — tunggu sebentar lalu coba lagi.');
      return;
    }
    if (issues.length > 0) {
      setCheckoutMsg(
        'Ada item yang stoknya tidak mencukupi. Sesuaikan quantity atau hapus item tersebut.'
      );
      return;
    }
    if (!nameOk || !waOk) {
      setCheckoutMsg(
        !nameOk
          ? 'Isi nama Anda (min. 2 karakter).'
          : 'Nomor WhatsApp tidak valid (8–16 digit).'
      );
      return;
    }
    const message = buildWhatsAppMessage(items, {
      name,
      whatsapp,
      note,
    });
    window.open(buildWhatsAppUrl(message), '_blank', 'noopener,noreferrer');
  };

  if (items.length === 0) {
    return (
      <div className="shop-state" role="status">
        <div className="section-tag" style={{ justifyContent: 'center' }}>
          <span className="star">✹</span>
          <span className="label">[CART EMPTY]</span>
        </div>
        <h2>Cart masih kosong</h2>
        <p>
          Jelajahi koleksi Kares Studio dan tambahkan produk favorit Anda
          ke cart.
        </p>
        <div className="shop-state-actions">
          <Link href="/collection" className="btn-primary">
            Lihat Koleksi
          </Link>
          <Link href="/" className="btn-outline">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="cart-layout">
        <div className="cart-list" aria-label="Cart items">
          {stockState === 'error' ? (
            <p className="cart-notice" role="alert">
              Gagal memvalidasi stok terbaru.{' '}
              <button type="button" onClick={() => void refreshStocks()}>
                Coba lagi
              </button>
            </p>
          ) : null}
          {items.map((item) => {
            const stock = stocks.get(item.variantId);
            const issue = issueByVariant.get(item.variantId);
            const atMax = stock !== undefined && item.quantity >= stock;
            return (
              <article key={item.variantId} className="cart-item">
                <Link
                  href={`/product/${item.productSlug}`}
                  className="cart-thumb"
                  aria-label={`View ${item.productName}`}
                >
                  {item.imageSrc ? (
                    <CardImage
                      src={item.imageSrc}
                      alt={`Kares Studio ${item.productName}`}
                    />
                  ) : (
                    <div className="ph">[PRODUCT]</div>
                  )}
                </Link>
                <div className="cart-item-main">
                  <div className="cart-item-head">
                    <div>
                      <Link
                        href={`/product/${item.productSlug}`}
                        className="cart-item-name"
                      >
                        {item.productName}
                      </Link>
                      <p className="cart-item-variant">
                        <span
                          className="cart-dot"
                          style={{
                            backgroundColor: item.colorHex || 'var(--border)',
                          }}
                          aria-hidden="true"
                        />
                        {item.colorName} · {item.sizeName}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="cart-remove"
                      onClick={() => removeItem(item.variantId)}
                      aria-label={`Remove ${item.productName} (${item.colorName}, ${item.sizeName})`}
                    >
                      Hapus
                    </button>
                  </div>
                  {issue ? (
                    <p className="cart-issue" role="alert">
                      {issue.kind === 'missing'
                        ? 'Varian tidak lagi tersedia — hapus item ini.'
                        : issue.kind === 'soldout'
                          ? 'Sold Out — hapus item ini.'
                          : `Stok tersisa ${issue.available} — ${ISSUE_TEXT[issue.kind]}.`}{' '}
                      {issue.kind === 'exceeds' ? (
                        <button
                          type="button"
                          onClick={() => clampToStock(item.variantId)}
                        >
                          Sesuaikan ke {issue.available}
                        </button>
                      ) : null}
                    </p>
                  ) : null}
                  <div className="cart-item-foot">
                    <div
                      className="cart-qty"
                      role="group"
                      aria-label={`Quantity for ${item.productName}`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity(item.variantId, item.quantity - 1)
                        }
                        disabled={item.quantity <= 1}
                        aria-label="Kurangi quantity"
                      >
                        −
                      </button>
                      <span aria-live="polite">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity(item.variantId, item.quantity + 1)
                        }
                        disabled={
                          stockState === 'loading' ||
                          (stock !== undefined && item.quantity >= stock)
                        }
                        aria-label="Tambah quantity"
                        title={
                          atMax
                            ? `Maksimal stok (${stock})`
                            : 'Tambah quantity'
                        }
                      >
                        +
                      </button>
                    </div>
                    <p className="cart-line-total">
                      {formatIDR(item.price * item.quantity)}
                    </p>
                  </div>
                  <p className="cart-unit-price">
                    {formatIDR(item.price)} / pcs
                    {stock !== undefined ? ` · Stok: ${stock}` : ''}
                  </p>
                </div>
              </article>
            );
          })}
        </div>

        <aside className="cart-summary" aria-label="Order summary">
          <div className="section-tag">
            <span className="star">✹</span>
            <span className="label">[ORDER SUMMARY]</span>
          </div>
          <dl className="cart-totals">
            <div>
              <dt>Total item</dt>
              <dd>{count} pcs</dd>
            </div>
            <div>
              <dt>Subtotal</dt>
              <dd>{formatIDR(subtotal)}</dd>
            </div>
            <div className="cart-grand">
              <dt>Total</dt>
              <dd>{formatIDR(subtotal)}</dd>
            </div>
          </dl>

          <div className="cart-checkout">
            <p className="filter-label">[CHECKOUT]</p>
            <label>
              <span>Nama</span>
              <input
                type="text"
                placeholder="Nama Anda"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={formTouched && !nameOk}
              />
            </label>
            <label>
              <span>No. WhatsApp</span>
              <input
                type="tel"
                placeholder="08xxxxxxxxxx"
                autoComplete="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                aria-invalid={formTouched && !waOk}
              />
            </label>
            <label>
              <span>Catatan (opsional)</span>
              <textarea
                placeholder="Alamat / catatan pesanan"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            {formTouched && (!nameOk || !waOk) ? (
              <p className="pdp-hint" role="alert">
                {!nameOk
                  ? 'Isi nama Anda (min. 2 karakter).'
                  : 'Nomor WhatsApp tidak valid (8–16 digit).'}
              </p>
            ) : null}
            {checkoutMsg ? (
              <p className="pdp-hint" role="alert">
                {checkoutMsg}
              </p>
            ) : null}
            <button
              type="button"
              className="btn-primary cart-wa-btn"
              onClick={handleCheckout}
              disabled={!canCheckout}
              aria-disabled={!canCheckout}
            >
              Checkout via WhatsApp
            </button>
            <p className="filter-hint">
              Pesanan dikirim ke {getStoreWhatsappNumber()} via WhatsApp.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
