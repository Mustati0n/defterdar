import axe, { type Result } from 'axe-core';

export async function accessibilityViolations(
  container: HTMLElement,
): Promise<Array<Pick<Result, 'id' | 'impact' | 'help'>>> {
  const result = await axe.run(container, {
    rules: {
      // JSDOM has no visual layout engine; contrast remains covered by tokens.
      'color-contrast': { enabled: false },
    },
  });

  return result.violations.map(({ id, impact, help }) => ({
    id,
    impact,
    help,
  }));
}
