import { act, render, screen } from '@testing-library/react';
import { PageHeading } from './page-heading';

describe('PageHeading', () => {
  const originalRaf = window.requestAnimationFrame;
  const originalScrollY = window.scrollY;

  beforeEach(() => {
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 2000,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 0,
      writable: true,
    });
    window.requestAnimationFrame = (callback) => {
      callback(0);
      return 0;
    };
  });

  afterAll(() => {
    window.requestAnimationFrame = originalRaf;
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: originalScrollY,
    });
  });

  it('compacts a long page after the threshold', () => {
    render(
      <PageHeading
        eyebrow="Özet"
        title="İstatistikler"
        description="Açıklama"
        action={<button>Filtre</button>}
      />,
    );
    const heading = screen.getByRole('banner');
    expect(heading).not.toHaveAttribute('data-compact');
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 200,
    });
    act(() => window.dispatchEvent(new Event('scroll')));
    expect(heading).toHaveAttribute('data-compact', 'true');

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 100,
    });
    act(() => window.dispatchEvent(new Event('scroll')));
    expect(heading).toHaveAttribute('data-compact', 'true');

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 40,
    });
    act(() => window.dispatchEvent(new Event('scroll')));
    expect(heading).not.toHaveAttribute('data-compact');
  });

  it('keeps a static short-page header stable', () => {
    render(
      <PageHeading
        eyebrow="Ayarlar"
        title="Profil"
        description="Açıklama"
        variant="static"
      />,
    );
    act(() => window.dispatchEvent(new Event('scroll')));
    expect(screen.getByRole('banner')).not.toHaveAttribute('data-compact');
  });
});
