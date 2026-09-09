'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Kares Studio — Phase 5 cart store (client).
 *
 * Holds validated variant items (product_id + color/size snapshot +
 * price + image), keyed by product_variants.id. Same variant merges
 * quantity; different variants are separate items. Persists to
 * localStorage so the cart survives refresh/navigation.
 * Stock clamping happens at the UI layer with fresh variant_stock data.
 */
export interface CartItem {
  /** product_variants.id — unique per (product, color, size). */
  variantId: string;
  productId: string;
  productSlug: string;
  productName: string;
  price: number;
  imageSrc: string | null;
  colorId: string;
  colorName: string;
  colorHex: string;
  sizeId: string;
  sizeName: string;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  lastAddedAt: number | null;
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = 'kares-cart-v1';

function loadInitial(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (i) =>
        typeof i?.variantId === 'string' &&
        typeof i?.productId === 'string' &&
        typeof i?.productSlug === 'string' &&
        typeof i?.productName === 'string' &&
        typeof i?.price === 'number' &&
        typeof i?.colorId === 'string' &&
        typeof i?.colorName === 'string' &&
        typeof i?.sizeId === 'string' &&
        typeof i?.sizeName === 'string' &&
        typeof i?.quantity === 'number' &&
        i.quantity > 0
    );
  } catch {
    return [];
  }
}

function persist(next: CartItem[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — cart still works in memory */
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadInitial);
  const [lastAddedAt, setLastAddedAt] = useState<number | null>(null);

  const addItem = useCallback(
    (item: Omit<CartItem, 'quantity'>, quantity = 1) => {
      const qty = Math.max(1, Math.floor(quantity));
      setItems((prev) => {
        const next = [...prev];
        const idx = next.findIndex((i) => i.variantId === item.variantId);
        if (idx >= 0) {
          next[idx] = {
            ...next[idx],
            quantity: next[idx].quantity + qty,
          };
        } else {
          next.push({ ...item, quantity: qty });
        }
        persist(next);
        return next;
      });
      setLastAddedAt(Date.now());
    },
    []
  );

  /** Set exact quantity; min 1 (use removeItem to delete). */
  const setQuantity = useCallback((variantId: string, quantity: number) => {
    const qty = Math.max(1, Math.floor(quantity));
    setItems((prev) => {
      const next = prev.map((i) =>
        i.variantId === variantId ? { ...i, quantity: qty } : i
      );
      persist(next);
      return next;
    });
  }, []);

  const removeItem = useCallback((variantId: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.variantId !== variantId);
      persist(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    persist([]);
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((n, i) => n + i.quantity, 0);
    const subtotal = items.reduce((n, i) => n + i.price * i.quantity, 0);
    return { items, count, subtotal, lastAddedAt, addItem, setQuantity, removeItem, clear };
  }, [items, lastAddedAt, addItem, setQuantity, removeItem, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
