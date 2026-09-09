import { getSupabase } from '@/lib/supabase/query';
import type { Category } from '@/types';

/** All categories, ordered by name. */
export async function getCategories(): Promise<Category[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data as Category[];
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return (data as Category | null) ?? null;
}
