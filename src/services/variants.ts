import { getSupabase } from '@/lib/supabase/query';
import type { Color, ProductVariant, ProductVariantWithStock, Size } from '@/types';

/** Variants for a product with color/size relations joined. */
export async function getProductVariants(
  productId: string
): Promise<(ProductVariant & { color: Color; size: Size })[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('product_variants')
    .select('*, color:colors(*), size:sizes(*)')
    .eq('product_id', productId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as (ProductVariant & { color: Color; size: Size })[];
}

/** Current stock for one variant: TOTAL IN − TOTAL OUT (via view). */
export async function getVariantStock(variantId: string): Promise<number> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('variant_stock')
    .select('stock')
    .eq('variant_id', variantId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return 0;
  return (data as { stock: number }).stock ?? 0;
}

/** All variants with joined color/size + computed stock. */
export async function getVariantsWithStock(
  productId: string
): Promise<ProductVariantWithStock[]> {
  const supabase = getSupabase();
  const variants = await getProductVariants(productId);
  const { data: stockRows, error } = await supabase
    .from('variant_stock')
    .select('variant_id, total_in, total_out, stock');
  if (error) throw error;

  const byVariant = new Map(
    (stockRows as { variant_id: string; total_in: number; total_out: number; stock: number }[]).map(
      (r) => [r.variant_id, r]
    )
  );

  return variants.map((v) => ({
    ...v,
    total_in: byVariant.get(v.id)?.total_in ?? 0,
    total_out: byVariant.get(v.id)?.total_out ?? 0,
    stock: byVariant.get(v.id)?.stock ?? 0,
  }));
}

export async function getColors(): Promise<Color[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('colors').select('*').order('name');
  if (error) throw error;
  return data as Color[];
}

export async function getSizes(): Promise<Size[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('sizes')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data as Size[];
}
