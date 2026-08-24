import { render, screen } from '@testing-library/react';
import { useExpense, useLedger, usePlan, useVoidExpense } from '@/features/data/hooks';
import ExpenseDetailPage from './page';

jest.mock('next/navigation', () => ({
  useParams: () => ({ expenseId: 'expense-1' }),
}));
jest.mock('@/features/data/hooks', () => ({
  useExpense: jest.fn(),
  useLedger: jest.fn(),
  usePlan: jest.fn(),
  useVoidExpense: jest.fn(),
}));
jest.mock('@/features/auth/auth-provider', () => ({
  useAuth: () => ({ user: { id: 'me' } }),
}));
jest.mock('@/components/ui/toast', () => ({ useToast: () => jest.fn() }));
jest.mock('@/features/expenses/receipt-panel', () => ({
  ReceiptPanel: () => <div>Fişler</div>,
}));
jest.mock('@/features/financial/offset-split-card', () => ({
  OffsetSplitCard: () => <div>Pay satırı</div>,
}));
jest.mock('@/components/ui/confirmation-dialog', () => ({
  ConfirmationDialog: () => null,
}));

describe('Expense detail context and terminology', () => {
  beforeEach(() => {
    jest.mocked(useExpense).mockReturnValue({
      data: {
        id: 'expense-1',
        ledgerId: 'ledger-1',
        planId: 'plan-1',
        categoryId: null,
        category: null,
        createdById: 'me',
        payerId: 'me',
        payer: { id: 'me', displayName: 'Ece' },
        title: 'Akşam yemeği',
        description: null,
        amountMinor: '10000',
        currency: 'TRY',
        splitMethod: 'EQUAL',
        isGift: false,
        expenseDate: '2026-08-24',
        voidedAt: null,
        version: 1,
        splits: [],
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useExpense>);
    jest.mocked(useLedger).mockReturnValue({
      data: { role: 'OWNER', archivedAt: null },
    } as ReturnType<typeof useLedger>);
    jest.mocked(usePlan).mockReturnValue({
      data: { status: 'ACTIVE' },
    } as ReturnType<typeof usePlan>);
    jest.mocked(useVoidExpense).mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useVoidExpense>);
  });

  it('returns a Plan-bound Expense to its Plan and never renders the raw split enum', () => {
    render(<ExpenseDetailPage />);
    expect(screen.getByRole('link', { name: /Plan'a dön/ })).toHaveAttribute(
      'href',
      '/plans/plan-1',
    );
    expect(screen.getByText('Eşit böl')).toBeInTheDocument();
    expect(screen.queryByText('EQUAL')).not.toBeInTheDocument();
  });
});
