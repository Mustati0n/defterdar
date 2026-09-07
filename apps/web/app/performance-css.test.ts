import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const readStyle = (name: string) =>
  readFileSync(join(process.cwd(), 'app/styles', name), 'utf8');

describe('motion and font performance guardrails', () => {
  it('uses local font fallbacks instead of adding network font work', () => {
    const tokens = readStyle('tokens-base.css');

    expect(tokens).not.toContain('@font-face');
    expect(tokens).toContain('ui-sans-serif, system-ui');
    expect(tokens).toContain("'Iowan Old Style'");
  });

  it('limits compositor promotion to elements actively transitioning', () => {
    const motion = readStyle('motion.css');

    expect(motion).toMatch(
      /\.onboarding-step\.is-exiting--forward,[\s\S]*will-change: transform, opacity/s,
    );
    expect(motion).not.toMatch(
      /\.onboarding-step\s*\{[^}]*will-change: transform, opacity/s,
    );
  });

  it('keeps page-change motion on compositor-friendly properties', () => {
    const motion = readStyle('motion.css');

    expect(motion).toMatch(
      /\.detail-view-transition\[data-direction='forward'\]\s*\{[\s\S]*?animation:/,
    );
    expect(motion).toContain('transform: translateX(12px)');
    expect(motion).toContain('opacity: 0.94');
  });
});
