import { render, screen } from '@testing-library/react';
import { useOverview } from '@/features/data/hooks';
import OverviewPage from './page';

jest.mock('@/features/data/hooks', () => ({
  useOverview: jest.fn(),
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
    jest.mocked(useOverview).mockReturnValue({
      data: {
        ledgers: [ledger],
        plans: [],
        ledgerBalances: [],
        planBalances: [],
        activity: { items: [], nextCursor: null },
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useOverview>);
  });

  it('keeps one primary heading and does not present first-Ledger metrics as a summary', () => {
    render(<OverviewPage />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Defterler' })).toBeInTheDocument();
    expect(screen.queryByText('Kişisel Defterim harcaması')).not.toBeInTheDocument();
    expect(screen.queryByText('Ortak hesabın hafızası burada.')).not.toBeInTheDocument();
  });

  it('does not render data sections when there is no data', () => {
    jest.mocked(useOverview).mockReturnValue({
      data: {
        ledgers: [],
        plans: [],
        ledgerBalances: [],
        planBalances: [],
        activity: null,
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useOverview>);
    render(<OverviewPage />);
    expect(screen.queryByRole('heading', { name: 'Defterler' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Planlar' })).not.toBeInTheDocument();
  });
});
