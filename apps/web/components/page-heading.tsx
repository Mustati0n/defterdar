'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
  tools,
  variant = 'adaptive',
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  tools?: ReactNode;
  variant?: 'adaptive' | 'static';
}) {
  const headerRef = useRef<HTMLElement>(null);
  const compactRef = useRef(false);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    if (variant === 'static') return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const longPage =
        document.documentElement.scrollHeight > window.innerHeight + 180;
      const next = !longPage
        ? false
        : compactRef.current
          ? window.scrollY > 64
          : window.scrollY > 160;
      if (next === compactRef.current) return;
      compactRef.current = next;
      setCompact(next);
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
  }, [variant]);

  return (
    <header
      className={`page-heading page-heading--${variant}${compact ? ' is-compact' : ''}`}
      data-compact={compact || undefined}
      ref={headerRef}
    >
      <div className="page-heading__copy">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {tools ? <div className="page-heading__tools">{tools}</div> : null}
      {action ? <div className="page-heading__action">{action}</div> : null}
    </header>
  );
}
