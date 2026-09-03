import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

function readCssGraph(file: string, seen = new Set<string>()): string {
  if (seen.has(file)) return '';
  seen.add(file);
  const content = readFileSync(file, 'utf8');
  return content.replace(
    /@import\s+['"]([^'"]+)['"];?/g,
    (_statement, importPath: string) =>
      readCssGraph(resolve(dirname(file), importPath), seen),
  );
}

function luminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((value) => Number.parseInt(value, 16) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4),
    );
  const [red, green, blue] = channels;
  if (red === undefined || green === undefined || blue === undefined) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function contrast(first: string, second: string) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  const [lighter, darker] = values;
  if (lighter === undefined || darker === undefined) {
    throw new Error('Two colors are required for contrast');
  }
  return (lighter + 0.05) / (darker + 0.05);
}

describe('critical accessibility CSS', () => {
  const css = readCssGraph(join(process.cwd(), 'app/globals.css'));

  it('uses a focus indicator above the 3:1 component target on paper', () => {
    expect(contrast('#8d2d4a', '#fffdf5')).toBeGreaterThanOrEqual(3);
    expect(css).toContain('--focus-ring-color: #8d2d4a');
    expect(css).toMatch(
      /:focus-visible\s*\{[^}]*outline: var\(--focus-ring-width\) solid var\(--focus-ring-color\)/s,
    );
  });

  it('keeps critical controls at least 44px and honors mobile safe areas', () => {
    expect(css).toMatch(
      /\.icon-button\s*\{[^}]*width: 2\.75rem;[^}]*height: 2\.75rem/s,
    );
    expect(css).toMatch(
      /\.dialog-card__close\s*\{[^}]*width: 44px;[^}]*height: 44px/s,
    );
    expect(css).toMatch(
      /\.sidebar__collapse\s*\{[^}]*width: 44px;[^}]*height: 44px/s,
    );
    expect(css).toContain('env(safe-area-inset-bottom)');
    expect(css).toContain('100dvh');
  });

  it('keeps document scrolling available beneath sticky surfaces', () => {
    expect(css).toMatch(/\.app-main\s*\{[^}]*overflow-x: clip/s);
    expect(css).not.toMatch(/\.app-main\s*\{[^}]*overflow: hidden/s);
    expect(css).toMatch(/html\s*\{[^}]*scroll-behavior: auto/s);
  });
});
