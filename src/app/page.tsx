import { Suspense } from 'react';
import Navbar from '@/components/layout/Navbar';
import Hero from '@/components/home/Hero';
import BrandStatement from '@/components/home/BrandStatement';
import CategoriesSection from '@/components/home/CategoriesSection';
import FeaturedSection from '@/components/home/FeaturedSection';
import Quality from '@/components/home/Quality';
import Manifesto from '@/components/home/Manifesto';
import Assistance from '@/components/home/Assistance';
import Footer from '@/components/home/Footer';
import ScrollReveal from '@/components/home/ScrollReveal';
import {
  CategoriesSkeleton,
  FeaturedSkeleton,
} from '@/components/home/HomeSkeletons';
import { getHomepageContent } from '@/services/cms';
import type { HomepageCmsMap } from '@/services/cms';

/**
 * Kares Studio homepage — migrated 1:1 from the final homepage design.
 *
 * Phase 2: Categories + Featured Collection are server components fed by
 * Supabase (with safe fallbacks); all other sections stay static until
 * the CMS phase. Skeletons keep dimensions identical — no layout shift.
 *
 * Phase 6: CMS content (text/image only) is fetched once here and passed
 * as props; every section falls back to its hardcoded copy when CMS is
 * empty/unreachable, so layout/markup never change.
 */
export default async function HomePage() {
  let cms: HomepageCmsMap = {};
  let cmsReady = false;
  try {
    cms = await getHomepageContent();
    cmsReady = Object.keys(cms).length > 0;
  } catch {
    cms = {};
    cmsReady = false;
  }

  return (
    <>
      <Navbar />
      <main>
        <Hero cms={cms} />
        <BrandStatement cms={cms} />
        <Suspense fallback={<CategoriesSkeleton />}>
          <CategoriesSection />
        </Suspense>
        <Suspense fallback={<FeaturedSkeleton />}>
          <FeaturedSection cms={cms} />
        </Suspense>
        <Quality cms={cms} />
        <Manifesto cms={cms} />
        <Assistance cms={cms} cmsReady={cmsReady} />
      </main>
      <Footer cms={cms} />
      <ScrollReveal />
    </>
  );
}
