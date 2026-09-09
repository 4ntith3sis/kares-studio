import { revalidatePath } from 'next/cache';

/**
 * Kares Studio — storefront cache invalidation after admin mutations.
 * SERVER ONLY: import exclusively from API routes / server components.
 * Never import from client components.
 *
 * Collection/homepage/PDP are server components whose Supabase fetches
 * go through Next's fetch cache. After any product/category/image/CMS
 * mutation the affected paths must be revalidated, otherwise deleted
 * products keep appearing (and new/edited content stays invisible)
 * until the next deployment or manual refresh cycle.
 */
export type StorefrontPath =
  | '/collection'
  | '/'
  | '/about'
  | '/contact'
  | 'product';

export function revalidateStorefront(paths: StorefrontPath[] = ['/collection', '/']) {
  for (const p of paths) {
    try {
      if (p === 'product') {
        revalidatePath('/product/[slug]', 'page');
      } else {
        revalidatePath(p, 'page');
      }
    } catch {
      /* revalidate is a no-op outside request scope — never crash admin */
    }
  }
}
