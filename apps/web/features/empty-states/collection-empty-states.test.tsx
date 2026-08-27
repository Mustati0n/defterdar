import { render, screen } from '@testing-library/react';
import { LedgerEmptyState, PlanEmptyState } from './collection-empty-states';

describe('smart collection empty states', () => {
  it('sends an empty Ledger user to the create flow', () => {
    render(<LedgerEmptyState />);
    expect(
      screen.getByRole('link', { name: /Defter oluştur/ }),
    ).toHaveAttribute('href', '/workspace?type=ledger&create=ledger');
  });

  it('keeps Ledger context in an empty Plan CTA', () => {
    render(<PlanEmptyState ledgerId="ledger-7" />);
    expect(screen.getByRole('link', { name: /Plan oluştur/ })).toHaveAttribute(
      'href',
      '/plans?create=1&ledgerId=ledger-7',
    );
  });
});
