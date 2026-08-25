'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

export function SignatureLine() {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress =
        scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0;
      rootRef.current?.style.setProperty('--scroll-progress', String(progress));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return (
    <div className="signature-line" aria-hidden="true" ref={rootRef}>
      <svg viewBox="0 0 1200 54" preserveAspectRatio="none">
        <path
          className="signature-line__track"
          d="M0 36 C125 37 163 12 294 18 S510 44 674 25 S918 14 1052 26 C1120 36 1158 42 1175 26 C1185 17 1185 7 1199 6"
        />
        <path
          className="signature-line__progress"
          pathLength="1"
          d="M0 36 C125 37 163 12 294 18 S510 44 674 25 S918 14 1052 26 C1120 36 1158 42 1175 26 C1185 17 1185 7 1199 6"
        />
      </svg>
    </div>
  );
}
