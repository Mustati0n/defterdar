import { fireEvent, render, screen } from '@testing-library/react';
import { useAllPlans, useLedgers } from '@/features/data/hooks';
import { useAnalyticsSelection } from '@/features/analytics/use-analytics-selection';
import StatisticsPage from './page';

const select = jest.fn();

jest.mock('@/features/data/hooks', () => ({
  useLedgers: jest.fn(),
  useAllPlans: jest.fn(),
}));
jest.mock('@/features/auth/auth-provider', () => ({
  useAuth: () => ({ user: { id: 'me', displayName: 'Ece' } }),
}));
jest.mock('@/features/analytics/use-analytics-selection', () => ({
  useAnalyticsSelection: jest.fn(),
}));
jest.mock('@/features/page-intro/page-intro', () => ({
  PageIntro: () => null,
}));
jest.mock('@/features/analytics/analytics-experience', () => ({
  AnalyticsDateControls: () => <div>Tarih kontrolleri</div>,
  AnalyticsExperience: ({
    scope,
    resourceId,
  }: {
    scope: string;
    resourceId: string;
  }) => <div>{`${scope}:${resourceId}`}</div>,
}));

const ledger = {
  id: 'ledger-1',
  name: 'Ev hesabı',
  type: 'SHARED' as const,
  currency: 'TRY',
};
const standalone = {
  id: 'plan-1',
  name: 'Kilis Gezisi',
  ledgerId: null,
  scope: 'STANDALONE' as const,
  currency: 'TRY',
  status: 'ACTIVE' as const,
  participantCount: 2,
};
const bound = {
  ...standalone,
  id: 'plan-2',
  name: 'Akşam Yemeği',
  ledgerId: 'ledger-1',
  scope: 'LEDGER' as const,
};

function queryResult(data: unknown[]) {
  return {
    data,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  };
}

describe('flexible analytics scopes', () => {
  beforeEach(() => {
    select.mockClear();
    jest
      .mocked(useLedgers)
      .mockReturnValue(
        queryResult([ledger]) as unknown as ReturnType<typeof useLedgers>,
      );
    jest
      .mocked(useAllPlans)
      .mockReturnValue(
        queryResult([standalone, bound]) as unknown as ReturnType<
          typeof useAllPlans
        >,
      );
    jest.mocked(useAnalyticsSelection).mockReturnValue({
      selection: '',
      select,
    });
  });

  it('groups every real Ledger and Plan without inventing Personal Ledger', () => {
    render(<StatisticsPage />);
    expect(
      screen.getByRole('group', { name: 'Defterler' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Planlar' })).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Kilis Gezisi · Bağımsız' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Akşam Yemeği · Deftere bağlı' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: /Kişisel Defterim/ }),
    ).toBeNull();
    expect(screen.getByText('ledger:ledger-1')).toBeInTheDocument();
  });

  it('uses the stored target and persists a changed target', () => {
    jest.mocked(useAnalyticsSelection).mockReturnValue({
      selection: 'plan:plan-1',
      select,
    });
    render(<StatisticsPage />);
    expect(screen.getByText('plan:plan-1')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Analiz alanı'), {
      target: { value: 'plan:plan-2' },
    });
    expect(select).toHaveBeenCalledWith('plan:plan-2');
  });

  it('shows an honest empty state when no target exists', () => {
    jest
      .mocked(useLedgers)
      .mockReturnValue(
        queryResult([]) as unknown as ReturnType<typeof useLedgers>,
      );
    jest
      .mocked(useAllPlans)
      .mockReturnValue(
        queryResult([]) as unknown as ReturnType<typeof useAllPlans>,
      );
    render(<StatisticsPage />);
    expect(
      screen.getByText('Henüz analiz edilecek bir Defter veya Plan yok.'),
    ).toBeInTheDocument();
  });
});
