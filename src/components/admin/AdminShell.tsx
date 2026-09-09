'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ADMIN_NAV } from '@/lib/admin';
import { createClient } from '@/lib/supabase/client';

/**
 * Kares Studio — Admin shell (client chrome).
 * Sidebar on desktop; collapsible top nav on mobile. Storefront Navbar
 * is NOT used here — admin has its own layout.
 */
export default function AdminShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    try {
      await createClient().auth.signOut();
    } finally {
      router.replace('/admin/login');
      router.refresh();
    }
  };

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar${open ? ' open' : ''}`}>
        <Link href="/admin" className="admin-brand" onClick={() => setOpen(false)}>
          KARES<span>.</span> ADMIN
        </Link>
        <nav aria-label="Admin navigation">
          <ul>
            {ADMIN_NAV.map((item) => {
              const active =
                item.href === '/admin'
                  ? pathname === '/admin'
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={active ? 'active' : undefined}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <Link
          href="/"
          className="admin-back"
          onClick={() => setOpen(false)}
        >
          ← Back to Store
        </Link>
        <button
          type="button"
          className="admin-back admin-logout"
          onClick={() => void logout()}
        >
          Logout →
        </button>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button
            type="button"
            className="admin-menu-btn"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="Toggle admin menu"
          >
            ☰
          </button>
          <div>
            <h1>{title}</h1>
            <p className="admin-eyebrow">[ADMIN AREA — KARES STUDIO]</p>
          </div>
        </header>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
