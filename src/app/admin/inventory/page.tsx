import AdminInventoryClient from '@/components/admin/AdminInventoryClient';

/** Kares Studio — Admin Inventory route (?status= ?product= ?action=). */
export default function AdminInventoryPage({
  searchParams,
}: {
  searchParams: { status?: string; product?: string; action?: string };
}) {
  return (
    <AdminInventoryClient
      initialStatus={searchParams.status ?? ''}
      initialProduct={searchParams.product ?? ''}
      initialAction={searchParams.action ?? ''}
    />
  );
}
