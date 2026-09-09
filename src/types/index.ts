/**
 * Kares Studio — Phase 1 domain types.
 * Mirrors the Supabase schema 1:1. No `any` used.
 */

export type UUID = string;

export interface Category {
  id: UUID;
  name: string;
  slug: string;
  description: string | null;
  /** Homepage-only photo. Collection does not use category photos. */
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: UUID;
  category_id: UUID | null;
  name: string;
  slug: string;
  description: string | null;
  material: string | null;
  price: number;
  featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: UUID;
  product_id: UUID;
  image_url: string;
  sort_order: number;
  created_at: string;
}

export interface Color {
  id: UUID;
  name: string;
  hex_code: string;
  created_at: string;
}

export interface Size {
  id: UUID;
  name: string;
  sort_order: number;
  created_at: string;
}

/** PRODUCT + COLOR + SIZE. No editable stock column — stock is derived. */
export interface ProductVariant {
  id: UUID;
  product_id: UUID;
  color_id: UUID;
  size_id: UUID;
  created_at: string;
  updated_at: string;
}

export type InventoryType = 'in' | 'out';

export interface InventoryTransaction {
  id: UUID;
  variant_id: UUID;
  type: InventoryType;
  quantity: number;
  note: string | null;
  created_at: string;
}

export interface ProductVariantWithStock extends ProductVariant {
  color: Color;
  size: Size;
  total_in: number;
  total_out: number;
  stock: number;
}

export interface ProductWithRelations extends Product {
  category: Category | null;
  images: ProductImage[];
  variants: ProductVariantWithStock[];
}
