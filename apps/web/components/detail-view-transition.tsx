'use client';

import { useState, type ReactNode } from 'react';

type TransitionDirection = 'none' | 'forward' | 'backward';

export function DetailViewTransition<T extends string>({
  view,
  order,
  children,
}: {
  view: T;
  order: readonly T[];
  children: ReactNode;
}) {
  const [transition, setTransition] = useState<{
    view: T;
    direction: TransitionDirection;
  }>({ view, direction: 'none' });

  if (transition.view !== view) {
    setTransition({
      view,
      direction:
        order.indexOf(view) >= order.indexOf(transition.view)
          ? 'forward'
          : 'backward',
    });
  }

  return (
    <div
      className="detail-view-transition"
      data-direction={transition.direction}
      key={view}
    >
      {children}
    </div>
  );
}
