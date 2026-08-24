import { render, screen } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import {
  useAllPlans,
  useLedgerBalances,
  useLedgers,
  usePlanBalances,
} from '@/features/data/hooks';
import OverviewPage from './page';

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: jest.fn(),
}));
jest.mock('@/features/data/hooks', () => ({
  ...jest.requireActual('@/features/data/hooks'),
  useAllPlans: jest.fn(),
  useLedgerBalances: jest.fn(),
  useLedgers: jest.fn(),
  usePlanBalances: jest.fn(),
}));
jest.mock('@/features/auth/auth-provider', () => ({
  useAuth: () => ({ user: { id: 'me', displayName: 'Mustafa' } }),
}));
jest.mock('@/components/ledger-card', () => ({ LedgerCard: () => null }));
jest.mock('@/components/plan-card', () => ({ PlanCard: () => null }));

const ledger = {
  id: 'ledger-1',
  name: 'Kişisel Defterim',
  description: null,
  type: 'PERSONAL' as const,
  currency: 'TRY',
  ownerId: 'me',
  role: 'OWNER' as const,
  archivedAt: null,
  createdAt: '2026-08-24T10:00:00Z',
  updatedAt: '2026-08-24T10:00:00Z',
};

describe('Overview financial scope', () => {
  beforeEach(() => {
    jest.mocked(useLedgers).mockReturnValue({
      data: [ledger],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useLedgers>);
    jest.mocked(useAllPlans).mockReturnValue({
      plans: [],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    jest.mocked(useLedgerBalances).mockReturnValue({
      balances: [],
      entries: [],
      isLoading: false,
    });
    jest.mocked(usePlanBalances).mockReturnValue({
      entries: [],
      isLoading: false,
    });
    jest.mocked(useQuery).mockImplementation((options) => {
      const key = options.queryKey as readonly unknown[];
      if (key[0] === 'ledger-analytics') {
        return {
          data: {
            currency: 'TRY',
            totalExpenseMinor: '12500',
            totalIncomeMinor: '20000',
            netCashflowMinor: '7500',
            expenseCount: 2,
            incomeCount: 1,
            monthly: [],
            byCategory: [],
            paidByMember: [],
            shareByMember: [],
            currentBalances: { currency: 'TRY', positions: [], suggestions: [] },
          },
        } as ReturnType<typeof useQuery>;
      }
      return { data: { items: [], nextCursor: null } } as ReturnType<
        typeof useQuery
      >;
    });
  });

  it('labels first-Ledger metrics with the actual Ledger scope', () => {
    render(<OverviewPage />);
    expect(
      screen.getByRole('region', { name: 'Kişisel Defterim özeti' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Kişisel Defterim harcaması')).toBeInTheDocument();
    expect(screen.queryByText('İlk defter harcaması')).not.toBeInTheDocument();
  });
});
