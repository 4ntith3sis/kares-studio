import CategoriesInteractive from './CategoriesInteractive';
import type { HomepageCategory } from '@/services/homepage';
import { getHomepageCategories } from '@/services/homepage';
import { resolveImageUrl } from '@/lib/images';

// Fallback editorial content (DB unreachable/empty). Image paths are
// Supabase Storage object paths — resolved to public URLs like live data.
const FALLBACK_RAW = [
  {
    id: 'fallback-outerwear',
    name: 'Outerwear',
    slug: 'outerwear',
    description:
      'Premium jackets and coats crafted for everyday layering and essential streetwear style.',
    image_url: 'category/look-male-coat.jpeg',
    num: '01',
  },
  {
    id: 'fallback-tshirts',
    name: 'T-Shirts',
    slug: 't-shirts',
    description:
      'Essential streetwear tees made from heavyweight cotton for everyday comfort.',
    image_url: 'category/look-female-front.jpeg',
    num: '02',
  },
  {
    id: 'fallback-bottoms',
    name: 'Bottoms',
    slug: 'bottoms',
    description:
      'Modern cuts from cargo pants to tailored trousers crafted for everyday style.',
    image_url: 'category/look-male-triple.jpeg',
    num: '03',
  },
  {
    id: 'fallback-accessories',
    name: 'Accessories',
    slug: 'accessories',
    description:
      'Statement caps, bags, and finishing touches to complete every look.',
    image_url: 'category/look-female-side.jpeg',
    num: '04',
  },
];

export const FALLBACK_CATEGORIES: HomepageCategory[] = FALLBACK_RAW.map((c) => ({
  ...c,
  created_at: '',
  updated_at: '',
  imageSrc: resolveImageUrl(c.image_url),
}));

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
