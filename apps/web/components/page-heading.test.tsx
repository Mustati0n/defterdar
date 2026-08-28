import { act, render, screen } from '@testing-library/react';
import { PageHeading } from './page-heading';

describe('PageHeading', () => {
  const originalRaf = window.requestAnimationFrame;
  const originalScrollY = window.scrollY;
  const originalMatchMedia = window.matchMedia;

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
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
  });

  afterAll(() => {
    window.requestAnimationFrame = originalRaf;
    window.matchMedia = originalMatchMedia;
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: originalScrollY,
    });
  });

  it('updates scroll progress continuously between zero and one', () => {
    render(
      <PageHeading
        eyebrow="Özet"
        title="İstatistikler"
        description="Açıklama"
        action={<button>Filtre</button>}
      />,
    );
    const heading = screen.getByRole('banner');
    expect(heading).toHaveClass('page-heading--with-action');
    expect(heading).toHaveStyle({ '--header-progress': '0' });
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 120,
    });
    act(() => window.dispatchEvent(new Event('scroll')));
    expect(heading).toHaveStyle({ '--header-progress': '0.5' });

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 300,
    });
    act(() => window.dispatchEvent(new Event('scroll')));
    expect(heading).toHaveStyle({ '--header-progress': '1' });
    expect(heading).toHaveAttribute('data-compact-controls');
    expect(heading).not.toHaveStyle({
      '--header-flow-offset': expect.anything(),
    });

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 60,
    });
    act(() => window.dispatchEvent(new Event('scroll')));
    expect(heading).toHaveStyle({ '--header-progress': '0.25' });
  });

  it('marks tool-bearing headers so their grid can reserve a separate track', () => {
    render(
      <PageHeading
        eyebrow="Rakamlar"
        title="İstatistikler"
        description="Açıklama"
        tools={
          <select aria-label="Analiz alanı">
            <option>Ev</option>
          </select>
        }
      />,
    );

    expect(screen.getByRole('banner')).toHaveClass('page-heading--with-tools');
    expect(screen.getByLabelText('Analiz alanı')).toBeVisible();
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
    expect(screen.getByRole('banner')).not.toHaveAttribute(
      'data-scroll-linked',
    );
  });
});
