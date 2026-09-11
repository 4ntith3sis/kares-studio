import { Suspense } from 'react';
import type { ReactNode } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/home/Footer';
import CollectionExplorer from '@/components/collection/CollectionExplorer';
import {
  CollectionDbEmptyState,
  CollectionErrorState,
  CollectionSkeleton,
} from '@/components/collection/CollectionStates';
import { getCollectionData } from '@/services/collection';

/**
 * Kares Studio — Phase 3 Collection page (server).
 *
 * Single server fetch (products + primary images + categories); filtering,
 * search, and sorting run client-side in memory inside CollectionExplorer
 * with state mirrored in URL query params. Homepage is untouched.
 */
function CollectionShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="container-main shop-page">{children}</main>
      <Footer />
    </>
  );
}

function CollectionHeader() {
  return (
    <div className="shop-header">
      <div className="section-tag">
        <span className="star">✹</span>
        <span className="label">[COLLECTION]</span>
      </div>
      <h1>Collection</h1>
      <p>
        Katalog lengkap Kares Studio — saring berdasarkan kategori dan harga,
        cari berdasarkan nama, atau urutkan sesuai preferensi.
      </p>
    </div>
  );
}

export default async function CollectionPage() {
  let data;
  try {
    data = await getCollectionData();
  } catch (err) {
    // Dev-only: surface the real Supabase error (message/code/details).
    // Production keeps the user-friendly error state below. Never logs keys.
    if (process.env.NODE_ENV !== 'production') {
      const e = err as { message?: string; code?: string; details?: string; hint?: string };
      console.error('[collection] getCollectionData failed:', {
        message: e?.message ?? String(err),
        code: e?.code,
        details: e?.details,
        hint: e?.hint,
      });
    }
    return (
      <CollectionShell>
        <CollectionHeader />
        <CollectionErrorState />
      </CollectionShell>
    );
  }

  if (data.products.length === 0) {
    return (
      <CollectionShell>
        <CollectionHeader />
        <CollectionDbEmptyState />
      </CollectionShell>
    );
  }

  return (
    <CollectionShell>
      <CollectionHeader />
      <Suspense fallback={<CollectionSkeleton />}>
        <CollectionExplorer
          products={data.products}
          categories={data.categories}
        />
      </Suspense>
    </CollectionShell>
  );
}
