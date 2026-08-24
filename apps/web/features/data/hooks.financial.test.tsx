import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { api } from '@/lib/api-client';
import type { Expense } from '@/lib/types';
import {
  queryKeys,
  useCreateExpense,
  useUpdateExpense,
  useVoidExpense,
} from './hooks';

const baseExpense = {
  id: 'expense-1',
  ledgerId: 'ledger-1',
  planId: 'plan-a',
  version: 1,
  title: 'Dinner',
} as Expense;

function UpdateHarness() {
  const update = useUpdateExpense('expense-1');
  return (
    <button
      type="button"
      onClick={() =>
        update.mutate({ expectedVersion: 1, planId: 'plan-b' })
      }
    >
      {update.isSuccess ? 'updated' : 'update'}
    </button>
  );
}

function CreateHarness() {
  const create = useCreateExpense();
  return (
    <button
      type="button"
      onClick={() =>
        create.mutate({
          ledgerId: 'ledger-1',
          input: {
            title: 'Plan expense',
            amountMinor: 1000,
            payerUserId: 'me',
            planId: 'plan-a',
            isGift: false,
            expenseDate: '2026-08-24T10:00:00Z',
            split: { method: 'EQUAL', participantUserIds: ['me'] },
          },
        })
      }
    >
      {create.isSuccess ? 'created' : 'create'}
    </button>
  );
}

function VoidHarness() {
  const mutation = useVoidExpense('expense-1');
  return (
    <button type="button" onClick={() => mutation.mutate()}>
      {mutation.isSuccess ? 'voided' : 'void'}
    </button>
  );
}

function renderWithClient(client: QueryClient, child: React.ReactNode) {
  return render(
    <QueryClientProvider client={client}>{child}</QueryClientProvider>,
  );
}

function seedFinancialCaches(client: QueryClient) {
  const keys = [
    ['ledger-balance', 'ledger-1'],
    ['plan-balance', 'plan-a'],
    ['plan-balance', 'plan-b'],
    ['ledger-analytics', 'ledger-1', { from: '2026-01-01', to: '2026-01-31' }],
    ['plan-analytics', 'plan-a', { from: '2026-01-01', to: '2026-01-31' }],
    ['plan-analytics', 'plan-b', { from: '2026-01-01', to: '2026-01-31' }],
    ['expenses', 'ledger-1', { planId: undefined }],
    ['activity-preview', 'ledger-1'],
    ['activity-feed', 'ledger-1', { planId: 'plan-a' }],
    ['offset-availability', 'ledger-1', 'split-1'],
  ] as const;
  keys.forEach((key) => client.setQueryData(key, { cached: true }));
  return keys;
}

describe('financial Expense mutation hooks', () => {
  afterEach(() => jest.restoreAllMocks());

  it('invalidates Ledger plus old/new Plan truth after an Expense update', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    client.setQueryData(queryKeys.expense('expense-1'), baseExpense);
    const keys = seedFinancialCaches(client);
    jest.spyOn(api.expenses, 'update').mockResolvedValue({
      ...baseExpense,
      planId: 'plan-b',
      version: 2,
    });

    renderWithClient(client, <UpdateHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'update' }));
    await screen.findByRole('button', { name: 'updated' });

    keys.forEach((key) =>
      expect(client.getQueryState(key)?.isInvalidated).toBe(true),
    );
  });

  it('invalidates balance and every analytics range after Expense void', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    client.setQueryData(queryKeys.expense('expense-1'), baseExpense);
    const keys = seedFinancialCaches(client);
    jest.spyOn(api.expenses, 'void').mockResolvedValue({
      ...baseExpense,
      voidedAt: '2026-08-24T12:00:00Z',
    });

    renderWithClient(client, <VoidHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'void' }));
    await screen.findByRole('button', { name: 'voided' });

    const relevantKeys = keys.filter((key) => key[1] !== 'plan-b');
    await waitFor(() =>
      relevantKeys.forEach((key) =>
        expect(client.getQueryState(key)?.isInvalidated).toBe(true),
      ),
    );
  });

  it('invalidates Plan balance and all Plan/Ledger analytics after Plan Expense create', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const keys = seedFinancialCaches(client).filter(
      (key) => key[1] !== 'plan-b',
    );
    jest.spyOn(api.expenses, 'create').mockResolvedValue(baseExpense);

    renderWithClient(client, <CreateHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'create' }));
    await screen.findByRole('button', { name: 'created' });

    keys.forEach((key) =>
      expect(client.getQueryState(key)?.isInvalidated).toBe(true),
    );
  });
});
