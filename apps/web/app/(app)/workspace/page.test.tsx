import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useAllPlans, useLedgers } from '@/features/data/hooks';
import type { Ledger, Plan } from '@/lib/types';
import WorkspacePage, { filterWorkspaceItems, workspaceCardSize } from './page';

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
}));
jest.mock('next/dynamic', () => () => () => null);
jest.mock('@/features/data/hooks', () => ({
  useLedgers: jest.fn(),
  useAllPlans: jest.fn(),
}));
jest.mock('@/components/page-heading', () => ({
  PageHeading: ({
    title,
    action,
    tools,
  }: {
    title: string;
    action: React.ReactNode;
    tools: React.ReactNode;
  }) => (
    <header>
      <h1>{title}</h1>
      {action}
      {tools}
    </header>
  ),
}));

const ledger: Ledger = {
  id: 'ledger-1',
  name: 'Ev hesabı',
  description: 'Ortak giderler',
  currency: 'TRY',
  ownerId: 'me',
  role: 'OWNER',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-08-25T00:00:00Z',
  archivedAt: null,
  activeMemberCount: 3,
  activePlanCount: 1,
  isCollaborative: true,
};
const linkedPlan: Plan = {
  id: 'plan-1',
  ledgerId: 'ledger-1',
  scope: 'LEDGER',
  currency: 'TRY',
  name: 'Yaz tatili',
  description: 'Sahil planı',
  startsAt: null,
  endsAt: null,
  status: 'ACTIVE',
  createdById: 'me',
  createdAt: '2026-01-02T00:00:00Z',
  updatedAt: '2026-08-26T00:00:00Z',
  archivedAt: null,
  participantCount: 4,
};
const standalonePlan: Plan = {
  ...linkedPlan,
  id: 'plan-2',
  ledgerId: null,
  scope: 'STANDALONE',
  name: 'Kişisel hedef',
  description: 'Bağımsız plan',
  updatedAt: '2026-08-27T00:00:00Z',
};

describe('Defterler & Planlar workspace', () => {
  beforeEach(() => {
    jest.mocked(useLedgers).mockReturnValue({
      data: [ledger],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useLedgers>);
    jest.mocked(useAllPlans).mockReturnValue({
      data: [linkedPlan, standalonePlan],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useAllPlans>);
  });

  it('loads each collection once and hides linked plans by default', () => {
    render(<WorkspacePage />);
    expect(useLedgers).toHaveBeenCalledWith(true);
    expect(useAllPlans).toHaveBeenCalledWith(true);
    expect(
      document.querySelector('a[href="/ledgers/ledger-1"]'),
    ).toBeInTheDocument();
    expect(
      document.querySelector('a[href="/plans/plan-2"]'),
    ).toBeInTheDocument();
    expect(
      document.querySelector('a[href="/plans/plan-1"]'),
    ).not.toBeInTheDocument();

    const board = screen.getByRole('region', { name: 'Defterler ve Planlar' });
    expect(board).toHaveAttribute('data-layout', 'controlled-masonry');
    expect(
      within(board)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(['/plans/plan-2', '/ledgers/ledger-1']);
  });

  it('searches names and descriptions across both kinds', () => {
    render(<WorkspacePage />);
    fireEvent.change(screen.getByLabelText('Defter ve planlarda ara'), {
      target: { value: 'bağımsız' },
    });
    expect(
      document.querySelector('a[href="/ledgers/ledger-1"]'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Kişisel hedef/ }),
    ).toBeInTheDocument();
  });

  it('renders search, filters and both create actions from Yeni', () => {
    render(<WorkspacePage />);
    expect(
      screen.getByLabelText('Defter ve planlarda ara'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Son/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tümü/ })).toBeInTheDocument();
    expect(
      screen.getByRole('switch', {
        name: /Defterlere bağlı planları göster/,
      }),
    ).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(screen.getByRole('button', { name: /Yeni/ }));
    expect(
      screen.getByRole('menuitem', { name: /Yeni Defter/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: /Yeni Plan/ }),
    ).toBeInTheDocument();
  });

  it('includes linked plans only when the scope switch is enabled', () => {
    render(<WorkspacePage />);
    const scope = screen.getByRole('switch', {
      name: /Defterlere bağlı planları göster/,
    });

    fireEvent.click(scope);

    expect(scope).toHaveAttribute('aria-checked', 'true');
    expect(
      document.querySelector('a[href="/plans/plan-1"]'),
    ).toBeInTheDocument();
  });

  it('lets linked plans exit before compacting the remaining board', () => {
    jest.useFakeTimers();
    try {
      render(<WorkspacePage />);
      const scope = screen.getByRole('switch', {
        name: /Defterlere bağlı planları göster/,
      });
      fireEvent.click(scope);
      fireEvent.click(scope);

      const linkedCard = document.querySelector('a[href="/plans/plan-1"]');
      expect(scope).toHaveAttribute('aria-checked', 'false');
      expect(linkedCard?.closest('[data-workspace-key]')).toHaveClass(
        'is-exiting',
      );

      act(() => jest.advanceTimersByTime(220));

      expect(
        document.querySelector('a[href="/plans/plan-1"]'),
      ).not.toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  it('keeps the scope switch visible but disabled for the ledger type', () => {
    render(<WorkspacePage />);
    fireEvent.click(screen.getByRole('button', { name: 'Defter' }));

    expect(
      screen.getByRole('switch', {
        name: /Defterlere bağlı planları göster/,
      }),
    ).toBeDisabled();
  });

  it('uses truthful active and archived filters', () => {
    expect(
      filterWorkspaceItems(
        [ledger],
        [{ ...standalonePlan, status: 'COMPLETED' }],
        'active',
        'all',
        '',
      ),
    ).toEqual([expect.objectContaining({ kind: 'ledger' })]);
    expect(
      filterWorkspaceItems(
        [{ ...ledger, archivedAt: '2026-08-26T00:00:00Z' }],
        [{ ...standalonePlan, status: 'ARCHIVED' }],
        'archived',
        'all',
        '',
      ),
    ).toHaveLength(2);
  });

  it('applies linked-plan scope independently from the type filter', () => {
    const plans = [linkedPlan, standalonePlan];

    expect(filterWorkspaceItems([], plans, 'recent', 'all', '', false)).toEqual(
      [expect.objectContaining({ value: standalonePlan })],
    );
    expect(
      filterWorkspaceItems([], plans, 'recent', 'plan', '', true),
    ).toHaveLength(2);
    expect(
      filterWorkspaceItems([ledger], plans, 'recent', 'ledger', '', true),
    ).toEqual([expect.objectContaining({ kind: 'ledger' })]);
  });

  it('keeps Ledgers stable and sizes Plans by content density', () => {
    expect(
      workspaceCardSize({
        kind: 'ledger',
        value: { ...ledger, description: 'x'.repeat(180) },
      }),
    ).toBe('compact');
    expect(
      workspaceCardSize({
        kind: 'plan',
        value: { ...standalonePlan, description: null, participantCount: 1 },
      }),
    ).toBe('compact');
    expect(workspaceCardSize({ kind: 'plan', value: standalonePlan })).toBe(
      'regular',
    );
    expect(
      workspaceCardSize({
        kind: 'plan',
        value: {
          ...standalonePlan,
          description: 'x'.repeat(130),
          participantCount: 8,
        },
      }),
    ).toBe('tall');
  });
});
