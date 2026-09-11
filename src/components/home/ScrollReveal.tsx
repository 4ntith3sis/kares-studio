'use client';

import { useEffect } from 'react';

const SELECTOR =
  '#brand-statement, #categories, #featured, #quality, #manifesto, #assistance, #footer';

/**
 * 1:1 port of the homepage.html scroll behaviour:
 * brand-statement, categories, featured, quality, manifesto,
 * assistance, footer fade up once when entering the viewport.
 *
 * Uses a MutationObserver so sections streamed in later via Suspense
 * are picked up as well (a one-shot querySelectorAll on mount would
 * miss them).
 */
export default function ScrollReveal() {
  useEffect(() => {
    const seen = new WeakSet<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).style.animation =
              'fadeUp .7s ease both';
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.07 }
    );

    const watch = (el: Element) => {
      if (seen.has(el)) return;
      seen.add(el);
      (el as HTMLElement).style.opacity = '0';
      io.observe(el);
    };

    document.querySelectorAll(SELECTOR).forEach(watch);
    const mo = new MutationObserver(() => {
      document.querySelectorAll(SELECTOR).forEach(watch);
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      io.disconnect();
    };
  }, []);

  return null;
}
