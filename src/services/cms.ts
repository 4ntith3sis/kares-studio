import { getSupabase } from '@/lib/supabase/query';

/**
 * Kares Studio — Homepage CMS read layer (public, anon key).
 *
 * Reads `homepage_content` (section, key, value, image_url). Returns a
 * nested map; callers overlay it on hardcoded fallback copy so the
 * homepage never goes blank when CMS is empty or unreachable.
 */

export type HomepageCmsMap = Record<string, Record<string, string>>;

export interface HomepageCmsEntry {
  section: string;
  key: string;
  value: string | null;
  image_url: string | null;
}

export async function getHomepageContent(): Promise<HomepageCmsMap> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('homepage_content')
    .select('section, key, value, image_url');
  if (error) throw error;

  const map: HomepageCmsMap = {};
  for (const row of ((data ?? []) as HomepageCmsEntry[])) {
    if (!map[row.section]) map[row.section] = {};
    // Text fields use `value`; image fields use `image_url`.
    if (row.value !== null && row.value !== undefined) {
      map[row.section][row.key] = row.value;
    }
    if (row.image_url !== null && row.image_url !== undefined) {
      map[row.section][`${row.key}__image`] = row.image_url;
    }
    // Image-only rows (key = 'image'): expose as `<section>` fallback too.
    if (row.key === 'image' && row.image_url) {
      map[row.section].image = row.image_url;
    }
  }
  return map;
}

/** Overlay helper: CMS value wins, fallback otherwise. */
export function cmsText(
  cms: HomepageCmsMap,
  section: string,
  key: string,
  fallback: string
): string {
  const v = cms[section]?.[key];
  return v !== undefined && v !== '' ? v : fallback;
}

/** Overlay helper for images (object path or full URL or local path). */
export function cmsImage(
  cms: HomepageCmsMap,
  section: string,
  key: string,
  fallback: string
): string {
  const direct = cms[section]?.[key];
  if (direct !== undefined && direct !== '') return direct;
  const suffixed = cms[section]?.[`${key}__image`];
  if (suffixed !== undefined && suffixed !== '') return suffixed;
  return fallback;
}
