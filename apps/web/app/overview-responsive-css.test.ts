import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('overview responsive CSS', () => {
  const overviewCss = readFileSync(
    join(process.cwd(), 'app/styles/overview.css'),
    'utf8',
  );
  const adaptiveCss = readFileSync(
    join(process.cwd(), 'app/styles/adaptive-ui.css'),
    'utf8',
  );

  it('fits ledger and plan cards to the available grid width', () => {
    expect(overviewCss).toMatch(
      /\.overview-card-grid\s*\{[^}]*grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 300px\), 1fr\)\)/s,
    );
    expect(overviewCss).toMatch(
      /\.overview-card-grid--ledgers\s*\{[^}]*padding-left: 10px/s,
    );
    expect(overviewCss).toMatch(
      /\.overview-card-grid--ledgers \.ledger-card\s*\{[^}]*margin-left: 0/s,
    );
  });

  it('turns plans into a contained snap scroller on mobile', () => {
    expect(overviewCss).toMatch(
      /@media \(max-width: 760px\)[\s\S]*?\.overview-card-grid--plans\s*\{[^}]*grid-auto-columns: min\(82vw, 320px\);[^}]*grid-auto-flow: column;[^}]*overflow-x: auto;[^}]*scroll-snap-type: inline mandatory;/s,
    );
  });

  it('reserves mobile safe-area space for the fixed quick-add control', () => {
    expect(adaptiveCss).toMatch(
      /@media \(max-width: 760px\)[\s\S]*?\.app-main--overview \.page-container\s*\{[^}]*padding-bottom: max\(6rem, calc\(5rem \+ env\(safe-area-inset-bottom\)\)\);/s,
    );
  });
});
