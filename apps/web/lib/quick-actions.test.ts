import { buildQuickActionHref, getQuickActionContext } from './quick-actions';

describe('context-aware quick actions', () => {
  it('preselects the current Ledger for a new expense', () => {
    const context = getQuickActionContext('/ledgers/ledger-1');
    expect(buildQuickActionHref('expense', context)).toBe(
      '/expenses/new?ledgerId=ledger-1',
    );
  });

  it('preselects both Ledger and Plan inside a Plan detail', () => {
    const context = getQuickActionContext('/plans/plan-4', 'ledger-2');
    expect(buildQuickActionHref('expense', context)).toBe(
      '/expenses/new?ledgerId=ledger-2&planId=plan-4',
    );
  });

  it('opens a Plan create flow with known Ledger context', () => {
    expect(buildQuickActionHref('plan', { ledgerId: 'ledger-2' })).toBe(
      '/plans?create=1&ledgerId=ledger-2',
    );
  });
});
