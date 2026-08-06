'use client';
import { useEffect } from 'react';

// Mounted once on the homepage. Drives three effects across the whole page:
// 1) arms the #mirror-stage element's CSS transitions shortly after mount
// 2) reveals any [data-reveal] element as it scrolls into view
// 3) counts up any [data-countto] number as it scrolls into view
// All of it is skipped in favor of the final state when prefers-reduced-motion is set.
export default function MirrorStageMotion() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const stage = document.getElementById('mirror-stage');

    if (reduced) {
      stage?.classList.add('armed');
      document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('in'));
      document.querySelectorAll<HTMLElement>('[data-countto]').forEach((el) => {
        el.textContent = (el.getAttribute('data-countto') || '') + (el.getAttribute('data-suffix') || '');
      });
      return;
    }

    const armTimer = setTimeout(() => stage?.classList.add('armed'), 150);

    let io: IntersectionObserver | undefined;
    let io2: IntersectionObserver | undefined;

    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add('in');
              io!.unobserve(e.target);
            }
          });
        },
        { threshold: 0.15 }
      );
      document.querySelectorAll('[data-reveal]').forEach((el) => io!.observe(el));

      io2 = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            const el = e.target as HTMLElement;
            const to = parseFloat(el.getAttribute('data-countto')!);
            const decimals = parseInt(el.getAttribute('data-decimals') || '0');
            const suffix = el.getAttribute('data-suffix') || '';
            const start = performance.now();
            const dur = 1400;
            function tick(now: number) {
              const p = Math.min(1, (now - start) / dur);
              const eased = 1 - Math.pow(1 - p, 3);
              el.textContent = (to * eased).toFixed(decimals) + suffix;
              if (p < 1) requestAnimationFrame(tick);
            }
            requestAnimationFrame(tick);
            io2!.unobserve(el);
          });
        },
        { threshold: 0.5 }
      );
      document.querySelectorAll<HTMLElement>('[data-countto]').forEach((el) => io2!.observe(el));
    }

    return () => {
      clearTimeout(armTimer);
      io?.disconnect();
      io2?.disconnect();
    };
  }, []);

  return null;
}
