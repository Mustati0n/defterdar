'use client';

import Link from 'next/link';
import {
  useLayoutEffect,
  useRef,
  type MouseEvent,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'defterdar:card-detail-origin';
const MAX_ORIGIN_AGE_MS = 10_000;

interface CardOrigin {
  key: string;
  recordedAt: number;
}

function recordCardOrigin(event: MouseEvent<HTMLAnchorElement>, key: string) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return;

  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ key, recordedAt: Date.now() } satisfies CardOrigin),
    );
  } catch {
    // Navigation must remain usable when storage is unavailable.
  }
}

export function CardDetailLink({
  href,
  className,
  transitionKey,
  children,
}: {
  href: string;
  className: string;
  transitionKey: string;
  children: ReactNode;
}) {
  return (
    <Link
      className={className}
      href={href}
      onClick={(event) => recordCardOrigin(event, transitionKey)}
    >
      {children}
    </Link>
  );
}

export function CardDetailSurface({
  transitionKey,
  children,
}: {
  transitionKey: string;
  children: ReactNode;
}) {
  const surfaceRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    try {
      const serialized = sessionStorage.getItem(STORAGE_KEY);
      if (!serialized) return;
      sessionStorage.removeItem(STORAGE_KEY);
      const origin = JSON.parse(serialized) as CardOrigin;
      if (
        origin.key === transitionKey &&
        Date.now() - origin.recordedAt <= MAX_ORIGIN_AGE_MS
      ) {
        surfaceRef.current?.setAttribute('data-from-card', 'true');
      }
    } catch {
      // A malformed or unavailable session store must not block the detail.
    }
  }, [transitionKey]);

  return (
    <div className="card-detail-surface" ref={surfaceRef}>
      {children}
    </div>
  );
}
