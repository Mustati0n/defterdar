import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Design System V1 CSS contract', () => {
  const styles = join(process.cwd(), 'app/styles');
  const tokens = readFileSync(join(styles, 'tokens-base.css'), 'utf8');
  const collections = readFileSync(join(styles, 'collections.css'), 'utf8');
  const dialogs = readFileSync(join(styles, 'dialogs-settings.css'), 'utf8');

  it.each([
    '--color-brand:',
    '--font-size-md:',
    '--space-4:',
    '--border-color:',
    '--radius-control:',
    '--elevation-1:',
    '--focus-ring-color:',
    '--motion-fast:',
    '--surface-canvas:',
    '--state-success-bg:',
  ])('defines the %s semantic token family', (token) => {
    expect(tokens).toContain(token);
  });

  it('connects shared controls to semantic design tokens', () => {
    expect(tokens).toMatch(
      /\.button--primary\s*\{[^}]*var\(--color-accent\)[^}]*var\(--elevation-control\)/s,
    );
    expect(tokens).toMatch(
      /\.input\s*\{[^}]*var\(--border-color\)[^}]*var\(--surface-base\)/s,
    );
  });

  it('uses shared surface and state roles across composite UI', () => {
    expect(collections).toMatch(
      /\.status-chip--active\s*\{[^}]*var\(--state-success-bg\)/s,
    );
    expect(collections).toMatch(
      /\.collection-toolbar\s*\{[^}]*var\(--surface-base\)[^}]*var\(--elevation-1\)/s,
    );
    expect(dialogs).toMatch(
      /\.dialog-card\s*\{[^}]*var\(--surface-subtle\)[^}]*var\(--elevation-3\)/s,
    );
  });
});
