import { getSupabase } from '@/lib/supabase/query';
import type { InventoryTransaction, InventoryType } from '@/types';

/**
 * Inventory transaction history for a variant, newest first.
 * Stock itself is derived (IN − OUT); never stored/edited directly.
 */
export async function getInventoryTransactions(
  variantId: string
): Promise<InventoryTransaction[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('inventory_transactions')
    .select('*')
    .eq('variant_id', variantId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as InventoryTransaction[];
}

/**
 * Record stock movement. Server/DB trigger rejects OUT that would make
 * stock negative (race-safe via row lock).
 */
export async function createInventoryTransaction(input: {
  variant_id: string;
  type: InventoryType;
  quantity: number;
  note?: string | null;
}): Promise<InventoryTransaction> {
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    throw new Error('quantity must be an integer greater than 0');
  }
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('inventory_transactions')
    .insert({
      variant_id: input.variant_id,
      type: input.type,
      quantity: input.quantity,
      note: input.note ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as InventoryTransaction;
}
