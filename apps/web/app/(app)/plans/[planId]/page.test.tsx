import { render, screen } from '@testing-library/react';
import { useLedger, useLedgers, usePlanDetailData } from '@/features/data/hooks';
import PlanDetailPage, { planNextStep } from './page';

let view: string | null = null;

jest.mock('next/navigation', () => ({
  useParams: () => ({ planId: 'plan-1' }),
  useSearchParams: () => ({ get: () => view }),
}));
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: () => ({ data: [] }),
}));
jest.mock('@/features/data/hooks', () => ({
  ...jest.requireActual('@/features/data/hooks'),
  useLedger: jest.fn(),
  useLedgers: jest.fn(),
  usePlanDetailData: jest.fn(),
}));
jest.mock('@/features/auth/auth-provider', () => ({
  useAuth: () => ({ user: { id: 'me' } }),
}));
jest.mock('@/features/plans/plan-management', () => ({
  PlanLifecycleAction: () => <button>Planı tamamla</button>,
  PlanParticipantsPanel: () => <div>Katılımcı alanı</div>,
  PlanSettingsPanel: () => <div>Ayar alanı</div>,
}));
jest.mock('@/features/activity/activity-feed', () => ({
  ActivityFeed: () => <div>Plan hareketleri alanı</div>,
}));
jest.mock('@/features/financial/balance-experience', () => ({
  BalanceExperience: () => <div>Plan hesabı alanı</div>,
}));
jest.mock('@/features/analytics/analytics-experience', () => ({
  AnalyticsExperience: () => <div>Plan istatistik alanı</div>,
}));

const plan = {
  id: 'plan-1',
  ledgerId: 'ledger-1',
  name: 'Tatil',
  description: null,
  startsAt: null,
  endsAt: null,
  status: 'ACTIVE' as const,
  createdById: 'me',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  archivedAt: null,
  participantCount: 2,
};

describe('Plan detail information architecture', () => {
  beforeEach(() => {
    view = null;
    jest.mocked(usePlanDetailData).mockReturnValue({
      plan: { data: plan, isLoading: false, isError: false },
      participants: { data: [] },
      balance: { data: { currency: 'TRY', positions: [], suggestions: [] } },
      expenses: { data: [] },
    } as unknown as ReturnType<typeof usePlanDetailData>);
    jest.mocked(useLedger).mockReturnValue({
      data: { role: 'OWNER', archivedAt: null },
    } as ReturnType<typeof useLedger>);
    jest.mocked(useLedgers).mockReturnValue({ data: [] } as unknown as ReturnType<
      typeof useLedgers
    >);
  });

  it('keeps lifecycle completion accessible from the core General context', () => {
    render(<PlanDetailPage />);
    expect(screen.getByRole('button', { name: 'Planı tamamla' })).toBeInTheDocument();
    expect(screen.getByText('İlk harcamayı ekle.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Hesap/ })).toHaveAttribute(
      'href',
      '/plans/plan-1?view=balances',
    );
  });

  it('restores Plan view from the URL on refresh/back style rerenders', () => {
    const rendered = render(<PlanDetailPage />);
    view = 'activity';
    rendered.rerender(<PlanDetailPage />);
    expect(screen.getByText('Plan hareketleri alanı')).toBeInTheDocument();
    view = 'invalid';
    rendered.rerender(<PlanDetailPage />);
    expect(screen.getByRole('button', { name: 'Planı tamamla' })).toBeInTheDocument();
  });

  it('derives the next step from actual Plan state', () => {
    expect(planNextStep('ACTIVE', 1, 0)).toMatch(/katılımcıları ekle/i);
    expect(planNextStep('ACTIVE', 2, 0)).toBe('İlk harcamayı ekle.');
    expect(planNextStep('COMPLETED', 2, 3)).toMatch(/tamamlandı/i);
    expect(planNextStep('ARCHIVED', 2, 3)).toMatch(/arşivde/i);
  });
});
