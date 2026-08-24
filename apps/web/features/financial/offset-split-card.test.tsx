import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ToastProvider } from '@/components/ui/toast';
import { api } from '@/lib/api-client';
import type { Expense, ExpenseSplit, OffsetAvailability } from '@/lib/types';
import { OffsetSplitCard } from './offset-split-card';

const availability: OffsetAvailability = {
  expenseSplitId: 'split-1',
  eligible: true,
  splitAmountMinor: '8000',
  offsetAppliedMinor: '0',
  remainingReimbursableMinor: '8000',
  priorSuggestionMinor: '10000',
  maxOffsetMinor: '8000',
  reason: null,
};
const expense = {
  id: 'expense-1',
  ledgerId: 'ledger-1',
  planId: 'plan-1',
  createdById: 'me',
  payerId: 'me',
  currency: 'TRY',
  isGift: false,
  voidedAt: null,
} as Expense;
const split = {
  id: 'split-1',
  user: { id: 'other', displayName: 'Ada' },
  amountMinor: '8000',
  isReimbursable: true,
  offsetAppliedMinor: '0',
  remainingReimbursableMinor: '8000',
  offsets: [],
  createdAt: '2026-08-24T10:00:00Z',
} satisfies ExpenseSplit;

function setup(targetSplit: ExpenseSplit = split) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  client.setQueryData(
    ['offset-availability', 'ledger-1', 'split-1'],
    availability,
  );
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <OffsetSplitCard
          expense={expense}
          split={targetSplit}
          role="MEMBER"
          currentUserId="me"
          disabled={false}
        />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return invalidate;
}

describe('OffsetSplitCard financial refresh', () => {
  beforeEach(() => {
    jest.spyOn(api.offsets, 'availability').mockResolvedValue(availability);
  });
  afterEach(() => jest.restoreAllMocks());

  it('refreshes Expense indicators, balances, analytics, activity and availability after create', async () => {
    jest.spyOn(api.offsets, 'create').mockResolvedValue({
      id: 'offset-1',
      expenseSplitId: 'split-1',
      amountMinor: '8000',
      createdById: 'me',
      createdAt: '2026-08-24T10:00:00Z',
      voidedAt: null,
    });
    const invalidate = setup();

    const trigger = screen.getByRole('button', { name: 'Borçtan düş' });
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog');
    await waitFor(() =>
      expect(within(dialog).getByLabelText('Borçtan düşülecek tutar')).toHaveFocus(),
    );
    expect(within(dialog).getByText(/Mevcut borcun/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Bu paydan düşülecek/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Sonra/)).toBeInTheDocument();
    expect(
      within(dialog).queryByText(/Maksimum düşülebilir/),
    ).not.toBeInTheDocument();
    fireEvent.click(
      within(dialog).getByRole('button', {
        name: 'Borçtan düş',
      }),
    );
    await waitFor(() => expect(api.offsets.create).toHaveBeenCalled());

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['expenses', 'ledger-1'],
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['expense', 'expense-1'],
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['ledger-balance', 'ledger-1'],
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['plan-balance', 'plan-1'],
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['ledger-analytics', 'ledger-1'],
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['plan-analytics', 'plan-1'],
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['activity-feed', 'ledger-1'],
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['offset-availability', 'ledger-1'],
    });
  });

  it('uses the same authoritative refresh matrix after void', async () => {
    const activeOffset = {
      id: 'offset-1',
      expenseSplitId: 'split-1',
      amountMinor: '4000',
      createdById: 'me',
      createdAt: '2026-08-24T10:00:00Z',
      voidedAt: null,
    };
    jest
      .spyOn(api.offsets, 'void')
      .mockResolvedValue({ ...activeOffset, voidedAt: '2026-08-24T11:00:00Z' });
    const invalidate = setup({ ...split, offsets: [activeOffset] });

    fireEvent.click(screen.getByRole('button', { name: 'Geri al' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'İşlemi geri al',
      }),
    );
    await waitFor(() =>
      expect(api.offsets.void).toHaveBeenCalledWith('offset-1'),
    );
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['ledger-analytics', 'ledger-1'],
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['offset-availability', 'ledger-1'],
    });
  });
});
