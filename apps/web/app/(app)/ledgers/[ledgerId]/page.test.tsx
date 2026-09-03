import { render, screen } from '@testing-library/react';
import { useLedgerDetailData } from '@/features/data/hooks';
import LedgerDetailPage from './page';

let view: string | null = null;

jest.mock('next/navigation', () => ({
  useParams: () => ({ ledgerId: 'ledger-1' }),
  useSearchParams: () => ({ get: () => view }),
}));
jest.mock('@/features/data/hooks', () => ({
  useLedgerDetailData: jest.fn(),
}));
jest.mock('@/features/auth/auth-provider', () => ({
  useAuth: () => ({ user: { id: 'me' } }),
}));
jest.mock('@/features/activity/activity-feed', () => ({
  ActivityFeed: () => <div>Tüm kayıt geçmişi</div>,
}));
jest.mock('@/features/financial/balance-experience', () => ({
  BalanceExperience: () => <div>Ortak bakiye alanı</div>,
}));
jest.mock('@/features/analytics/analytics-experience', () => ({
  AnalyticsExperience: () => <div>İstatistik alanı</div>,
}));
jest.mock('@/features/ledgers/ledger-management', () => ({
  LedgerMembersPanel: () => <div>Üye yönetimi alanı</div>,
  LedgerSettingsPanel: () => <div>Ayar alanı</div>,
}));
jest.mock('@/features/settings/category-manager', () => ({
  CategoryManager: () => <div>Kategori alanı</div>,
}));

const ledger = {
  id: 'ledger-1',
  name: 'Günlük',
  description: null,
  currency: 'TRY',
  ownerId: 'me',
  role: 'OWNER' as const,
  archivedAt: null,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  activeMemberCount: 1,
  activePlanCount: 0,
  isCollaborative: false,
};

function detailData(collaborative: boolean) {
  return {
    ledger: {
      data: {
        ...ledger,
        isCollaborative: collaborative,
        activeMemberCount: collaborative ? 2 : 1,
      },
      isLoading: false,
      isError: false,
    },
    plans: { data: [] },
    members: {
      data: [{ user: { id: 'me', displayName: 'Ece' }, role: 'OWNER' }],
    },
    balance: { data: { currency: 'TRY', positions: [], suggestions: [] } },
    expenses: { data: [] },
    incomes: { data: [] },
  } as unknown as ReturnType<typeof useLedgerDetailData>;
}

describe('Ledger detail information architecture', () => {
  beforeEach(() => {
    view = null;
    jest.mocked(useLedgerDetailData).mockReturnValue(detailData(false));
  });

  it('hides group balance language for a single-person Ledger', () => {
    render(<LedgerDetailPage />);
    expect(screen.getByLabelText('Defter özeti')).toHaveTextContent(
      'Tek kişilik alan',
    );
    expect(
      screen.getByRole('heading', { name: 'Son harcamalar' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Aktif üyeler')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /^Bakiyeler$/ }),
    ).not.toBeInTheDocument();
  });

  it('retains valid collaborative capabilities at secondary weight', () => {
    jest.mocked(useLedgerDetailData).mockReturnValue(detailData(true));
    render(<LedgerDetailPage />);
    expect(screen.getByRole('link', { name: /^Bakiyeler$/ })).toHaveAttribute(
      'href',
      '/ledgers/ledger-1?view=balances',
    );
    expect(screen.getByRole('link', { name: /Üyeler/ })).toHaveAttribute(
      'href',
      '/ledgers/ledger-1?view=members',
    );
    expect(screen.getByLabelText('Defter özeti')).toHaveTextContent('2 kişi');
    expect(screen.getAllByText('Sahip')).toHaveLength(1);
  });

  it('derives its rendered view from URL state on rerender and defaults invalid state', () => {
    const rendered = render(<LedgerDetailPage />);
    view = 'analytics';
    rendered.rerender(<LedgerDetailPage />);
    expect(screen.getByText('İstatistik alanı')).toBeInTheDocument();
    view = 'invalid';
    rendered.rerender(<LedgerDetailPage />);
    expect(
      screen.getByRole('heading', { name: 'Son harcamalar' }),
    ).toBeInTheDocument();
  });
});
