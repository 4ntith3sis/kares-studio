'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCart } from '@/components/cart/CartStore';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/collection', label: 'Collection' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

/** Active page matching: exact for top-level pages; Collection also covers product detail. */
function isLinkActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  if (href === '/collection')
    return pathname === '/collection' || pathname.startsWith('/product');
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // Lightweight route transition: fade + translateY on <main> per
  // navigation. Respects reduced-motion; never blocks navigation.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const main = document.querySelector('main');
    if (!main) return;
    main.classList.remove('page-enter');
    // Force reflow so the animation restarts on every route change.
    void (main as HTMLElement).offsetWidth;
    main.classList.add('page-enter');
  }, [pathname]);

  return (
    <header id="navbar">
      <div className="container-main nav-inner">
        <Link href="/" className="brand" aria-label="Kares Studio home">
          KARES STUDIO<span>.</span>
        </Link>

        <nav>
          <ul className="nav-links">
            {NAV_LINKS.map((link) => {
              const active = isLinkActive(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={active ? 'active' : undefined}
                    aria-current={active ? 'page' : undefined}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="nav-right">
          <CartButton />
          <button
            className="hamburger"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            {!menuOpen ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div id="mobile-menu" className={menuOpen ? 'open' : undefined}>
        {NAV_LINKS.map((link) => {
          const active = isLinkActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={active ? 'active' : undefined}
              aria-current={active ? 'page' : undefined}
            >
              {link.label}
            </Link>
          );
        })}
        <MobileCartLink />
      </div>
    </header>
  );
}

/**
 * Cart count readers. Always rendered inside <CartProvider> (root
 * layout), so useCart is unconditional and never throws in practice.
 */
function CartButton() {
  const cartCount = useCart().count;
  return (
    <Link href="/cart" className="cart-btn" aria-label={`Cart, ${cartCount} items`}>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>
      <span>({cartCount})</span>
    </Link>
  );
}

function MobileCartLink() {
  const cartCount = useCart().count;
  return <Link href="/cart">Cart ({cartCount})</Link>;
}
