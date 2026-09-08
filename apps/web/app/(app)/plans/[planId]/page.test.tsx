import { render, screen } from '@testing-library/react';
import {
  useLedger,
  useLedgers,
  usePlanDetailData,
} from '@/features/data/hooks';
import PlanDetailPage, { planNextStep } from './page';
import { accessibilityViolations } from '@/test/accessibility';

let view: string | null = null;

jest.mock('next/navigation', () => ({
  useParams: () => ({ planId: 'plan-1' }),
  useSearchParams: () => ({ get: () => view }),
}));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
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
  scope: 'LEDGER' as const,
  currency: 'TRY',
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
      balance: {
        data: { currency: 'TRY', positions: [], suggestions: [] },
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      },
      expenses: {
        data: [],
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      },
    } as unknown as ReturnType<typeof usePlanDetailData>);
    jest.mocked(useLedger).mockReturnValue({
      data: { role: 'OWNER', archivedAt: null },
    } as ReturnType<typeof useLedger>);
    jest
      .mocked(useLedgers)
      .mockReturnValue({ data: [] } as unknown as ReturnType<
        typeof useLedgers
      >);
  });

  it('keeps lifecycle completion accessible from the core General context', () => {
    render(<PlanDetailPage />);
    expect(
      screen.getByRole('button', { name: 'Planı tamamla' }),
    ).toBeInTheDocument();
    expect(screen.getByText('İlk harcamayı ekle.')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Henüz hesap oluşmadı' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: /Hesap/ })).toHaveAttribute(
      'href',
      '/plans/plan-1?view=balances',
    );
  });

  it('puts the current financial state before the four primary destinations', () => {
    jest.mocked(usePlanDetailData).mockReturnValue({
      plan: { data: plan, isLoading: false, isError: false },
      participants: { data: [] },
      balance: {
        data: {
          currency: 'TRY',
          positions: [
            { user: { id: 'me', displayName: 'Ece' }, netMinor: -1234 },
            { user: { id: 'other', displayName: 'Can' }, netMinor: 1234 },
          ],
          suggestions: [
            { fromUserId: 'me', toUserId: 'other', amountMinor: 1234 },
          ],
        },
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      },
      expenses: {
        data: [],
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      },
    } as unknown as ReturnType<typeof usePlanDetailData>);

    render(<PlanDetailPage />);

    const financialState = screen.getByRole('heading', { name: 'Borcun var' });
    const navigation = screen.getByRole('navigation', {
      name: 'Plan bölümleri',
    });
    expect(financialState.compareDocumentPosition(navigation)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.getByText('Senin durumun')).toBeVisible();
    expect(screen.getByText('Can kişisine')).toBeVisible();

    for (const [name, href] of [
      ['Genel', '/plans/plan-1'],
      ['Hesap', '/plans/plan-1?view=balances'],
      ['Katılımcılar', '/plans/plan-1?view=participants'],
      ['Hareketler', '/plans/plan-1?view=activity'],
    ] as const) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
    }
  });

  it('uses a compact Plan identity instead of the legacy metadata cover', () => {
    const { container } = render(<PlanDetailPage />);

    expect(screen.getByRole('heading', { name: 'Tatil' })).toBeVisible();
    expect(screen.getByLabelText('Plan özeti')).toHaveTextContent(
      'Başlangıç serbest',
    );
    const firstPage = container.querySelector('.plan-first-page');
    expect(firstPage).toBeVisible();
    expect(firstPage).toContainElement(
      screen.getByRole('heading', { name: 'Henüz hesap oluşmadı' }),
    );
    expect(firstPage).toContainElement(
      screen.getByRole('navigation', { name: 'Plan bölümleri' }),
    );
    expect(
      screen.getByRole('button', { name: 'Planı tamamla' }).closest(
        '.plan-first-page__actions',
      ),
    ).toBeInTheDocument();
    expect(container.querySelector('.detail-cover--plan')).toBeNull();
  });

  it('restores Plan view from the URL on refresh/back style rerenders', () => {
    const rendered = render(<PlanDetailPage />);
    view = 'activity';
    rendered.rerender(<PlanDetailPage />);
    expect(screen.getByText('Plan hareketleri alanı')).toBeInTheDocument();
    expect(
      screen.getByText('Plan hareketleri alanı').parentElement,
    ).toHaveAttribute('data-direction', 'forward');
    view = 'invalid';
    rendered.rerender(<PlanDetailPage />);
    expect(
      screen.getByRole('button', { name: 'Planı tamamla' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Takvim ve katılım' }).closest(
        '.detail-view-transition',
      ),
    ).toHaveAttribute('data-direction', 'backward');
  });

  it('derives the next step from actual Plan state', () => {
    expect(planNextStep('ACTIVE', 1, 0)).toMatch(/katılımcıları ekle/i);
    expect(planNextStep('ACTIVE', 2, 0)).toBe('İlk harcamayı ekle.');
    expect(planNextStep('COMPLETED', 2, 3)).toMatch(/tamamlandı/i);
    expect(planNextStep('ARCHIVED', 2, 3)).toMatch(/arşivde/i);
  });

  it('has no detectable structural accessibility violations', async () => {
    const { container } = render(<PlanDetailPage />);
    expect(await accessibilityViolations(container)).toEqual([]);
  });
});
