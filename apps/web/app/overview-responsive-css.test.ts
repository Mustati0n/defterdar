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

  it('keeps ledger and plan cards in one horizontally scrollable row', () => {
    expect(overviewCss).toMatch(
      /\.overview-card-grid\s*\{[^}]*display: flex;[^}]*overflow-x: auto;[^}]*scroll-snap-type: inline mandatory;/s,
    );
    expect(overviewCss).toMatch(
      /\.overview-card-grid--ledgers\s*\{[^}]*padding-left: 12px/s,
    );
    expect(overviewCss).toMatch(
      /\.overview-card-grid--ledgers \.ledger-card\s*\{[^}]*margin-left: 0/s,
    );
    expect(overviewCss).toMatch(
      /\.overview-card-grid \.ledger-card,[\s\S]*?\.overview-card-grid \.plan-card\s*\{[^}]*flex: 0 0 clamp\(250px, 28vw, 320px\);/s,
    );
  });

  it('uses viewport-friendly card widths on mobile', () => {
    expect(overviewCss).toMatch(
      /@media \(max-width: 760px\)[\s\S]*?\.overview-card-grid \.ledger-card,[\s\S]*?\.overview-card-grid \.plan-card\s*\{[^}]*flex-basis: min\(82vw, 300px\);/s,
    );
  });

  it('reserves mobile safe-area space for the fixed quick-add control', () => {
    expect(adaptiveCss).toMatch(
      /@media \(max-width: 760px\)[\s\S]*?\.app-main--overview \.page-container\s*\{[^}]*padding-bottom: max\(6rem, calc\(5rem \+ env\(safe-area-inset-bottom\)\)\);/s,
    );
  });
});
