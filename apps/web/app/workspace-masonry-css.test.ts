import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('controlled workspace masonry CSS', () => {
  const css = readFileSync(
    join(process.cwd(), 'app/styles/collections.css'),
    'utf8',
  );

  it('packs controlled card spans without reordering the DOM', () => {
    expect(css).toMatch(
      /\.workspace-grid\s*\{[^}]*grid-auto-rows: 4px;[^}]*grid-auto-flow: row;/s,
    );
    expect(css).not.toMatch(
      /\.workspace-grid\s*\{[^}]*grid-auto-flow: dense;/s,
    );
    expect(css).not.toMatch(/(?:^|[;{])\s*(?:columns|column-count)\s*:/m);
    expect(css).toContain('grid-row-end: span 77');
    expect(css).toContain('grid-row-end: span 97');
  });

  it('returns to natural single-column flow on mobile', () => {
    expect(css).toMatch(
      /@media \(max-width: 680px\)[\s\S]*?\.workspace-grid\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\);[^}]*grid-auto-rows: auto;/s,
    );
    expect(css).toMatch(
      /\.workspace-grid > \.workspace-card--tall\s*\{[^}]*height: auto;[^}]*grid-row-end: auto;/s,
    );
  });
});
