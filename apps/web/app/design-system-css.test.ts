import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Design System V1 CSS contract', () => {
  const styles = join(process.cwd(), 'app/styles');
  const tokens = readFileSync(join(styles, 'tokens-base.css'), 'utf8');
  const collections = readFileSync(join(styles, 'collections.css'), 'utf8');
  const dialogs = readFileSync(join(styles, 'dialogs-settings.css'), 'utf8');

  it.each([
    '--color-brand:',
    '--font-family-display:',
    '--font-family-ui:',
    '--font-size-md:',
    '--type-detail-display:',
    '--type-finance-hero:',
    '--tracking-finance:',
    '--space-4:',
    '--border-color:',
    '--radius-control:',
    '--elevation-1:',
    '--elevation-normal:',
    '--elevation-raised:',
    '--elevation-active:',
    '--focus-ring-color:',
    '--motion-fast:',
    '--surface-canvas:',
    '--surface-normal:',
    '--surface-active:',
    '--state-success-bg:',
  ])('defines the %s semantic token family', (token) => {
    expect(tokens).toContain(token);
  });

  it('defines readable detail and tabular financial typography primitives', () => {
    expect(tokens).toMatch(
      /\.type-detail-display\s*,[\s\S]*?var\(--font-family-display\)/,
    );
    expect(tokens).toMatch(
      /\.financial-number\s*,[\s\S]*?font-variant-numeric:\s*tabular-nums lining-nums/,
    );
    expect(tokens).toContain('--font-family-finance: var(--font-family-ui)');
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
    expect(tokens).toMatch(
      /\.surface--raised\s*\{[^}]*var\(--surface-raised\)[^}]*var\(--elevation-raised\)/s,
    );
    expect(tokens).toMatch(
      /\.surface--active\s*\{[^}]*var\(--surface-active\)[^}]*var\(--elevation-active\)/s,
    );
    expect(collections).toMatch(
      /\.status-chip--active\s*\{[^}]*var\(--state-success-bg\)/s,
    );
    expect(collections).toMatch(
      /\.collection-toolbar\s*\{[^}]*var\(--surface-base\)[^}]*var\(--elevation-1\)/s,
    );
    expect(dialogs).toMatch(
      /\.dialog-card\s*\{[^}]*var\(--surface-raised\)[^}]*var\(--elevation-raised\)/s,
    );
  });
});
