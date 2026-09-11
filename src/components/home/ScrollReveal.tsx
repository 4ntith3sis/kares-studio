'use client';

import { useEffect } from 'react';

const REVEAL_SELECTOR =
  '[data-reveal], [data-image-reveal], .pillar-stagger';

/**
 * Kares Studio motion engine — lightweight, no dependencies.
 *
 * - [data-reveal] / [data-image-reveal]: fade+translateY once on enter.
 *   Optional `data-delay="120"` sets --reveal-delay (stagger).
 * - [data-parallax]: subtle vertical drift (±14px max, rAF-throttled,
 *   disabled on touch / small screens / reduced-motion).
 * - Legacy section fallback: homepage sections without explicit
 *   attributes still get a one-shot fade-up (previous behaviour).
 * - Respects prefers-reduced-motion: reveals instantly, no parallax.
 */
export default function ScrollReveal() {
  useEffect(() => {
    document.body.classList.add('motion-on');
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    const seen = new WeakSet<Element>();
    const parallaxEls: HTMLElement[] = [];
    let ticking = false;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            if (el.hasAttribute('data-parallax') || el.hasAttribute('data-image-reveal') || el.hasAttribute('data-reveal') || el.classList.contains('pillar-stagger')) {
              el.classList.add('is-visible');
            } else {
              // Legacy section-level fallback (homepage sections).
              el.style.animation = 'fadeUp .7s ease both';
              el.style.opacity = '1';
            }
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -6% 0px' }
    );

    const watch = (el: Element) => {
      if (seen.has(el)) return;
      seen.add(el);
      const html = el as HTMLElement;
      const delay = html.getAttribute('data-delay');
      if (delay && /^\d+$/.test(delay)) {
        html.style.setProperty('--reveal-delay', `${delay}ms`);
      }
      if (
        html.hasAttribute('data-reveal') ||
        html.hasAttribute('data-image-reveal') ||
        html.classList.contains('pillar-stagger')
      ) {
        // Keep hidden until intersecting (CSS handles initial state),
        // unless reduced motion — then show immediately.
        if (reduced) {
          html.classList.add('is-visible');
          return;
        }
        io.observe(el);
        if (html.hasAttribute('data-parallax')) parallaxEls.push(html);
      } else {
        // Legacy whole-section fade (no data attrs).
        if (reduced) {
          html.style.opacity = '1';
          return;
        }
        html.style.opacity = '0';
        io.observe(el);
      }
    };

    const scan = () => {
      document.querySelectorAll(REVEAL_SELECTOR).forEach(watch);
      // Legacy: sections without explicit data attrs keep old behaviour.
      document
        .querySelectorAll(
          '#brand-statement, #categories, #featured, #quality, #manifesto, #assistance, #footer'
        )
        .forEach((el) => {
          const hasChild =
            el.querySelector('[data-reveal],[data-image-reveal]') !== null;
          if (!hasChild) watch(el);
        });
    };

    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });

    // Subtle parallax: translate inner image ±14px max, vertical only.
    const isTouch = window.matchMedia('(hover: none)').matches;
    const isSmall = window.innerWidth < 768;
    const parallaxOK = !reduced && !isTouch && !isSmall;

    const updateParallax = () => {
      ticking = false;
      if (!parallaxOK) return;
      const vh = window.innerHeight;
      for (const el of parallaxEls) {
        if (!el.isConnected) continue;
        const r = el.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) continue;
        const progress = (r.top + r.height / 2 - vh / 2) / vh; // -0.5..0.5
        const px = Math.max(-14, Math.min(14, progress * -28));
        el.style.setProperty('--px', `${px.toFixed(1)}px`);
      }
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateParallax);
      }
    };
    if (parallaxOK && parallaxEls.length >= 0) {
      updateParallax();
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
    }

    return () => {
      mo.disconnect();
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return null;
}
