import { QueryClient } from '@tanstack/react-query';
import { invalidateFinancialData } from './financial-invalidation';

describe('financial invalidation matrix', () => {
  it('invalidates every filtered analytics range and both old/new Plan scopes', async () => {
    const client = new QueryClient();
    const keys = [
      [
        'ledger-analytics',
        'ledger-1',
        { from: '2026-01-01', to: '2026-01-31' },
      ],
      [
        'ledger-analytics',
        'ledger-1',
        { from: '2026-02-01', to: '2026-02-28' },
      ],
      ['plan-analytics', 'plan-a', { from: '2026-01-01', to: '2026-01-31' }],
      ['plan-analytics', 'plan-b', { from: '2026-02-01', to: '2026-02-28' }],
      ['ledger-balance', 'ledger-1'],
      ['plan-balance', 'plan-a'],
      ['plan-balance', 'plan-b'],
      ['expenses', 'ledger-1', { planId: 'plan-a' }],
      ['expense', 'expense-1'],
      ['activity-preview', 'ledger-1'],
      ['activity-feed', 'ledger-1', { planId: 'plan-a' }],
      ['offset-availability', 'ledger-1', 'split-1'],
    ] as const;
    keys.forEach((key) => client.setQueryData(key, { cached: true }));
    client.setQueryData(
      ['ledger-analytics', 'other-ledger', { from: '2026-01-01' }],
      { cached: true },
    );

    await invalidateFinancialData(client, {
      ledgerId: 'ledger-1',
      planIds: ['plan-a', 'plan-b'],
      expenseId: 'expense-1',
      expenses: true,
    });

    keys.forEach((key) =>
      expect(client.getQueryState(key)?.isInvalidated).toBe(true),
    );
    expect(
      client.getQueryState([
        'ledger-analytics',
        'other-ledger',
        { from: '2026-01-01' },
      ])?.isInvalidated,
    ).toBe(false);
  });

  it('refreshes settlement lists but leaves balances alone for Income changes', async () => {
    const client = new QueryClient();
    client.setQueryData(['settlements', 'ledger-1', { planId: 'plan-a' }], []);
    client.setQueryData(['incomes', 'ledger-1', { planId: 'plan-a' }], []);
    client.setQueryData(['ledger-balance', 'ledger-1'], {});

    await invalidateFinancialData(client, {
      ledgerId: 'ledger-1',
      planIds: ['plan-a'],
      balances: false,
      offsetAvailability: false,
      incomes: true,
      settlements: true,
    });

    expect(
      client.getQueryState(['settlements', 'ledger-1', { planId: 'plan-a' }])
        ?.isInvalidated,
    ).toBe(true);
    expect(
      client.getQueryState(['incomes', 'ledger-1', { planId: 'plan-a' }])
        ?.isInvalidated,
    ).toBe(true);
    expect(
      client.getQueryState(['ledger-balance', 'ledger-1'])?.isInvalidated,
    ).toBe(false);
  });

  it('invalidates standalone Plan finance without requiring a Ledger key', async () => {
    const client = new QueryClient();
    const keys = [
      ['plan-balance', 'plan-a'],
      ['plan-analytics', 'plan-a', { from: undefined, to: undefined }],
      ['plan-activity', 'plan-a'],
      ['plan-expenses', 'plan-a'],
      ['plan-incomes', 'plan-a'],
      ['plan-settlements', 'plan-a'],
      ['offset-availability', 'plan:plan-a', 'split-1'],
    ] as const;
    keys.forEach((key) => client.setQueryData(key, { cached: true }));

    await invalidateFinancialData(client, {
      ledgerId: null,
      planIds: ['plan-a'],
      expenses: true,
      incomes: true,
      settlements: true,
    });

    keys.forEach((key) =>
      expect(client.getQueryState(key)?.isInvalidated).toBe(true),
    );
  });
});
