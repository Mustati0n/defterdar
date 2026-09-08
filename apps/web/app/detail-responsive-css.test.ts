import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function stylesheet(name: string) {
  return readFileSync(join(process.cwd(), 'app/styles', name), 'utf8');
}

describe('detail responsive CSS', () => {
  const planDetail = readFileSync(
    join(process.cwd(), 'app/(app)/plans/[planId]/page.module.css'),
    'utf8',
  );
  const financial = stylesheet('financial-surfaces.css');
  const adaptive = stylesheet('adaptive-ui.css');
  const motion = stylesheet('motion.css');
  const dialogs = stylesheet('dialogs-settings.css');
  const tokens = stylesheet('tokens-base.css');
  const collections = stylesheet('collections.css');

  it('stacks identity, financial status and approval surfaces on tablets', () => {
    expect(planDetail).toMatch(
      /@media \(max-width: 900px\)[\s\S]*?\.identity\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\);/s,
    );
    expect(financial).toMatch(
      /@media \(max-width: 900px\)[\s\S]*?\.financial-position\s*\{[^}]*grid-template-columns: auto minmax\(0, 1fr\);[\s\S]*?\.payment-attention__item,[\s\S]*?flex-direction: column;/s,
    );
  });

  it('uses a single-sheet navigation and transition model on mobile', () => {
    expect(adaptive).toMatch(
      /@media \(max-width: 760px\)[\s\S]*?\.detail-tabs\s*\{[^}]*position: relative;[^}]*top: auto;/s,
    );
    expect(motion).toMatch(
      /@media \(max-width: 760px\)[\s\S]*?\.detail-view-transition\[data-direction='forward'\],[\s\S]*?animation-name: detail-view-enter-mobile;/s,
    );
  });

  it('keeps long financial values, participant names and CTAs contained', () => {
    expect(financial).toMatch(
      /@media \(max-width: 480px\)[\s\S]*?\.financial-number--title\s*\{[^}]*font-size: clamp\(1\.45rem, 8vw, 2\.1rem\);/s,
    );
    expect(tokens).toMatch(
      /\.people-list article > div\s*\{[^}]*min-width: 0;[\s\S]*?\.people-list strong\s*\{[^}]*overflow-wrap: anywhere;/s,
    );
    expect(dialogs).toMatch(
      /@media \(max-width: 580px\)[\s\S]*?\.page-actions,[\s\S]*?width: 100%;[\s\S]*?\.people-list article\s*\{[^}]*grid-template-columns: auto minmax\(0, 1fr\) auto;/s,
    );
    expect(collections).toMatch(
      /\.status-chip\s*\{[^}]*overflow-wrap: anywhere;[^}]*white-space: normal;/s,
    );
  });
});
