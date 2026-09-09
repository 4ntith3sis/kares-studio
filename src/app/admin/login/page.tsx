import { Suspense } from 'react';
import AdminLoginClient from '@/components/admin/AdminLoginClient';

/** Kares Studio — /admin/login (public; middleware excludes it). */
export default function AdminLoginPage() {
  return (
    <Suspense fallback={<p className="admin-muted">Memuat…</p>}>
      <AdminLoginClient />
    </Suspense>
  );
}
