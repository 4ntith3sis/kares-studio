import FeaturedCarousel from './FeaturedCarousel';
import type { HomepageCmsMap } from '@/services/cms';
import type { HomepageFeaturedProduct } from '@/services/homepage';
import { getHomepageFeaturedProducts } from '@/services/homepage';

export const FALLBACK_FEATURED: HomepageFeaturedProduct[] = [
  {
    id: 'fallback-oversized-jacket',
    name: 'Oversized Jacket',
    slug: 'oversized-jacket',
    price: 450000,
    featured: true,
    categoryName: 'Outerwear',
    imageSrc: '/images/look-male-coat.jpeg',
  },
  {
    id: 'fallback-essential-tee',
    name: 'Essential Tee',
    slug: 'essential-tee',
    price: 195000,
    featured: true,
    categoryName: 'T-Shirts',
    imageSrc: '/images/look-female-front.jpeg',
  },
  {
    id: 'fallback-cargo-pants',
    name: 'Cargo Pants',
    slug: 'cargo-pants',
    price: 320000,
    featured: true,
    categoryName: 'Bottoms',
    imageSrc: '/images/look-male-triple.jpeg',
  },
  {
    id: 'fallback-classic-hoodie',
    name: 'Classic Hoodie',
    slug: 'classic-hoodie',
    price: 375000,
    featured: true,
    categoryName: 'T-Shirts',
    imageSrc: '/images/look-female-side.jpeg',
  },
];

/**
 * Server boundary for the Featured Collection section.
 * Uses live Supabase data (featured = true + primary image by sort_order)
 * when configured; falls back to the Phase 1 editorial cards so the
 * homepage never breaks when the database is empty or unreachable.
 */
export default async function FeaturedSection({ cms = {} }: { cms?: HomepageCmsMap }) {
  let products: HomepageFeaturedProduct[] = FALLBACK_FEATURED;
  try {
    const live = await getHomepageFeaturedProducts();
    if (live.length > 0) products = live;
  } catch {
    products = FALLBACK_FEATURED;
  }

  return <FeaturedCarousel products={products} cms={cms} />;
}
