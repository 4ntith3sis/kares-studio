import AdminProductsClient from '@/components/admin/AdminProductsClient';

/**
 * Kares Studio — Admin Products route (server wrapper).
 * Query params prefill toolbar state (?status=, ?search=, ?new=1).
 */
export default function AdminProductsPage({
  searchParams,
}: {
  searchParams: { status?: string; search?: string; new?: string };
}) {
  return (
    <AdminProductsClient
      initialStatus={searchParams.status ?? ''}
      initialSearch={searchParams.search ?? ''}
      showNew={searchParams.new === '1'}
    />
  );
}
