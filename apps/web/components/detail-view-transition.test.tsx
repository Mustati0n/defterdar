import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { DetailViewTransition } from './detail-view-transition';

const order = ['general', 'account', 'activity'] as const;

describe('DetailViewTransition', () => {
  it('uses one directional content transition for navigation changes', () => {
    const rendered = render(
      <DetailViewTransition view="general" order={order}>
        <p>Genel içerik</p>
      </DetailViewTransition>,
    );

    expect(screen.getByText('Genel içerik').parentElement).toHaveAttribute(
      'data-direction',
      'none',
    );

    rendered.rerender(
      <DetailViewTransition view="activity" order={order}>
        <p>Hareket içeriği</p>
      </DetailViewTransition>,
    );
    expect(screen.getByText('Hareket içeriği').parentElement).toHaveAttribute(
      'data-direction',
      'forward',
    );

    rendered.rerender(
      <DetailViewTransition view="account" order={order}>
        <p>Hesap içeriği</p>
      </DetailViewTransition>,
    );
    expect(screen.getByText('Hesap içeriği').parentElement).toHaveAttribute(
      'data-direction',
      'backward',
    );
  });

  it('removes the transition when reduced motion is requested', () => {
    const motionCss = readFileSync(
      join(process.cwd(), 'app/styles/motion.css'),
      'utf8',
    );

    expect(motionCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.detail-view-transition,\s*\.card-detail-surface\s*\{[^}]*animation: none !important;[^}]*transform: none !important;/s,
    );
  });
});
