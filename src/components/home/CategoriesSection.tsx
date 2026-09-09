import CategoriesInteractive from './CategoriesInteractive';
import type { HomepageCategory } from '@/services/homepage';
import { getHomepageCategories } from '@/services/homepage';

export const FALLBACK_CATEGORIES: HomepageCategory[] = [
  {
    id: 'fallback-outerwear',
    name: 'Outerwear',
    slug: 'outerwear',
    description:
      'Premium jackets and coats crafted for everyday layering and essential streetwear style.',
    image_url: '/images/look-male-coat.jpeg',
    created_at: '',
    updated_at: '',
    num: '01',
    imageSrc: '/images/look-male-coat.jpeg',
  },
  {
    id: 'fallback-tshirts',
    name: 'T-Shirts',
    slug: 't-shirts',
    description:
      'Essential streetwear tees made from heavyweight cotton for everyday comfort.',
    image_url: '/images/look-female-front.jpeg',
    created_at: '',
    updated_at: '',
    num: '02',
    imageSrc: '/images/look-female-front.jpeg',
  },
  {
    id: 'fallback-bottoms',
    name: 'Bottoms',
    slug: 'bottoms',
    description:
      'Modern cuts from cargo pants to tailored trousers crafted for everyday style.',
    image_url: '/images/look-male-triple.jpeg',
    created_at: '',
    updated_at: '',
    num: '03',
    imageSrc: '/images/look-male-triple.jpeg',
  },
  {
    id: 'fallback-accessories',
    name: 'Accessories',
    slug: 'accessories',
    description:
      'Statement caps, bags, and finishing touches to complete every look.',
    image_url: '/images/look-female-side.jpeg',
    created_at: '',
    updated_at: '',
    num: '04',
    imageSrc: '/images/look-female-side.jpeg',
  },
];

/**
 * Server boundary for the Categories section.
 * Uses live Supabase data when configured; falls back to the Phase 1
 * editorial content (same copy + local lookbook images) so the homepage
 * never breaks when the database is empty or unreachable.
 *
 * Layout/markup is identical to the original homepage design — the grid
 * lives inside CategoriesInteractive so hover can update the preview
 * image + corner label together.
 */
export default async function CategoriesSection() {
  let categories: HomepageCategory[] = FALLBACK_CATEGORIES;
  try {
    const live = await getHomepageCategories();
    if (live.length > 0) categories = live;
  } catch {
    categories = FALLBACK_CATEGORIES;
  }

  return (
    <section id="categories">
      <div className="container-main">
        <CategoriesInteractive categories={categories} />
      </div>
    </section>
  );
}
