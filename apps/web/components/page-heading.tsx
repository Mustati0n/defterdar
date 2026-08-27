'use client';

import { useEffect, useRef, type ReactNode } from 'react';

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

  useEffect(() => {
    if (variant === 'static') return;
    let frame = 0;
    let expandedHeight = headerRef.current?.getBoundingClientRect().height ?? 72;
    const compactHeight = 72;
    const update = () => {
      frame = 0;
      const reducedMotion =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const progress = reducedMotion
        ? 0
        : Math.min(1, Math.max(0, window.scrollY / 240));
      headerRef.current?.style.setProperty(
        '--header-progress',
        String(progress),
      );
      headerRef.current?.style.setProperty(
        '--header-flow-offset',
        `${Math.max(0, expandedHeight - compactHeight) * progress}px`,
      );
      headerRef.current?.toggleAttribute(
        'data-compact-controls',
        progress >= 0.98,
      );
    };
    const schedule = (event?: Event) => {
      if (event?.type === 'resize' && headerRef.current) {
        const currentHeight = headerRef.current.getBoundingClientRect().height;
        const currentOffset = Number.parseFloat(
          headerRef.current.style.getPropertyValue('--header-flow-offset'),
        );
        expandedHeight = currentHeight + (Number.isFinite(currentOffset) ? currentOffset : 0);
      }
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
      className={`page-heading page-heading--${variant}`}
      data-scroll-linked={variant === 'adaptive' || undefined}
      ref={headerRef}
    >
      <div className="page-heading__copy">
        <div className="page-heading__intro">
          <span className="eyebrow">{eyebrow}</span>
          <p>{description}</p>
        </div>
        <h1>{title}</h1>
      </div>
      {tools ? <div className="page-heading__tools">{tools}</div> : null}
      {action ? <div className="page-heading__action">{action}</div> : null}
    </header>
  );
}
