import { formatIDR } from '@/lib/utils/format';
import type { CartItem } from '@/components/cart/CartStore';

/**
 * Kares Studio — Phase 5 cart + WhatsApp checkout helpers.
 * Pure functions (no network, no Supabase import).
 */

export function getCartItemKey(item: Pick<CartItem, 'variantId'>): string {
  return item.variantId;
}

export function calculateCartTotal(items: CartItem[]): {
  count: number;
  subtotal: number;
} {
  return {
    count: items.reduce((n, i) => n + i.quantity, 0),
    subtotal: items.reduce((n, i) => n + i.price * i.quantity, 0),
  };
}

export interface CheckoutCustomer {
  name: string;
  whatsapp: string;
  note: string;
}

/** WhatsApp number as typed by the customer (digits, optional leading +). */
export function normalizeCustomerWhatsapp(value: string): string {
  return value.trim().replace(/[\s\-().]/g, '');
}

export function isValidCustomerWhatsapp(value: string): boolean {
  const digits = normalizeCustomerWhatsapp(value).replace(/^\+/, '');
  return /^[0-9]{8,16}$/.test(digits);
}

/**
 * Destination store number from env (digits only, e.g. 6281234567890).
 * Falls back to the documented placeholder when unconfigured.
 */
export function getStoreWhatsappNumber(): string {
  const raw =
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ??
    process.env.NEXT_PUBLIC_STORE_WHATSAPP ??
    '';
  const digits = raw.replace(/\D/g, '');
  return digits || '6281234567890';
}

export function buildWhatsAppMessage(
  items: CartItem[],
  customer: CheckoutCustomer
): string {
  const lines: string[] = [
    'Halo Kares Studio, saya ingin melakukan pemesanan:',
    '',
  ];
  items.forEach((item, i) => {
    lines.push(
      `${i + 1}. ${item.productName}`,
      `   Warna: ${item.colorName}`,
      `   Ukuran: ${item.sizeName}`,
      `   Qty: ${item.quantity}`,
      `   Harga: ${formatIDR(item.price)}`,
      `   Subtotal: ${formatIDR(item.price * item.quantity)}`,
      ''
    );
  });
  const { subtotal } = calculateCartTotal(items);
  lines.push(
    `Total: ${formatIDR(subtotal)}`,
    '',
    `Nama: ${customer.name.trim()}`,
    `No. WhatsApp: ${normalizeCustomerWhatsapp(customer.whatsapp)}`
  );
  if (customer.note.trim()) {
    lines.push(`Catatan: ${customer.note.trim()}`);
  }
  lines.push('', 'Mohon dibantu untuk proses pesanannya. Terima kasih.');
  return lines.join('\n');
}

export function buildWhatsAppUrl(message: string, storeNumber?: string): string {
  const to = (storeNumber ?? getStoreWhatsappNumber()).replace(/\D/g, '');
  return `https://wa.me/${to}?text=${encodeURIComponent(message)}`;
}

export type StockMap = Map<string, number>;

export interface CartStockIssue {
  variantId: string;
  productName: string;
  available: number;
  requested: number;
  kind: 'soldout' | 'exceeds' | 'missing';
}

/**
 * Validate cart quantities against fresh variant_stock.
 * Missing variant_id in the map = variant no longer exists.
 */
export function validateCartStock(
  items: CartItem[],
  stockByVariant: StockMap
): CartStockIssue[] {
  const issues: CartStockIssue[] = [];
  for (const item of items) {
    if (!stockByVariant.has(item.variantId)) {
      issues.push({
        variantId: item.variantId,
        productName: item.productName,
        available: 0,
        requested: item.quantity,
        kind: 'missing',
      });
    } else {
      const available = stockByVariant.get(item.variantId) ?? 0;
      if (available <= 0) {
        issues.push({
          variantId: item.variantId,
          productName: item.productName,
          available,
          requested: item.quantity,
          kind: 'soldout',
        });
      } else if (item.quantity > available) {
        issues.push({
          variantId: item.variantId,
          productName: item.productName,
          available,
          requested: item.quantity,
          kind: 'exceeds',
        });
      }
    }
  }
  return issues;
}
