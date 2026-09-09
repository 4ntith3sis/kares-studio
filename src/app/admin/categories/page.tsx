import AdminCategoriesClient from '@/components/admin/AdminCategoriesClient';

/** Kares Studio — Admin Categories route (?new=1 opens the form). */
export default function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: { new?: string };
}) {
  return <AdminCategoriesClient showNew={searchParams.new === '1'} />;
}
