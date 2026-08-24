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

describe('Overview hierarchy', () => {
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
    jest.mocked(useQuery).mockReturnValue({
      data: { items: [], nextCursor: null },
    } as ReturnType<
        typeof useQuery
      >);
  });

  it('keeps one primary heading and does not present first-Ledger metrics as a summary', () => {
    render(<OverviewPage />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Defterler' })).toBeInTheDocument();
    expect(screen.queryByText('Kişisel Defterim harcaması')).not.toBeInTheDocument();
    expect(screen.queryByText('Ortak hesabın hafızası burada.')).not.toBeInTheDocument();
  });

  it('does not render data sections when there is no data', () => {
    jest.mocked(useLedgers).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useLedgers>);
    render(<OverviewPage />);
    expect(screen.queryByRole('heading', { name: 'Defterler' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Planlar' })).not.toBeInTheDocument();
  });
});
