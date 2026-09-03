import type { LucideIcon } from 'lucide-react';
import { MoreHorizontal } from 'lucide-react';
import Link from 'next/link';

export interface DetailDestination<T extends string> {
  id: T;
  label: string;
  icon: LucideIcon;
}

export function resolveDetailView<T extends string>(
  candidate: string | null,
  allowed: readonly T[],
  fallback: T,
): T {
  return candidate && allowed.includes(candidate as T)
    ? (candidate as T)
    : fallback;
}

export function detailViewHref(basePath: string, view: string) {
  return view === 'general' ? basePath : `${basePath}?view=${view}`;
}

export function DetailNavigation<T extends string>({
  label,
  basePath,
  activeView,
  primary,
  secondary,
  secondaryLabel = 'Daha fazla',
}: {
  label: string;
  basePath: string;
  activeView: T;
  primary: readonly DetailDestination<T>[];
  secondary: readonly DetailDestination<T>[];
  secondaryLabel?: string;
}) {
  const secondaryActive = secondary.some((item) => item.id === activeView);

  return (
    <nav className="detail-tabs" aria-label={label}>
      {primary.map((destination) => {
        const Icon = destination.icon;
        const active = activeView === destination.id;
        return (
          <Link
            className={active ? 'is-active' : ''}
            href={detailViewHref(basePath, destination.id)}
            aria-current={active ? 'page' : undefined}
            key={destination.id}
          >
            <Icon /> {destination.label}
          </Link>
        );
      })}
      {secondary.length ? (
        <details
          className={`detail-tabs__more${secondaryActive ? ' is-active' : ''}`}
        >
          <summary>
            <MoreHorizontal /> {secondaryLabel}
          </summary>
          <div>
            {secondary.map((destination) => {
              const Icon = destination.icon;
              const active = activeView === destination.id;
              return (
                <Link
                  className={active ? 'is-active' : ''}
                  href={detailViewHref(basePath, destination.id)}
                  aria-current={active ? 'page' : undefined}
                  key={destination.id}
                >
                  <Icon /> {destination.label}
                </Link>
              );
            })}
          </div>
        </details>
      ) : null}
    </nav>
  );
}
