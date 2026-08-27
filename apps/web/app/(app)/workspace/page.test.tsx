import { fireEvent, render, screen } from '@testing-library/react';
import { useAllPlans, useLedgers } from '@/features/data/hooks';
import type { Ledger, Plan } from '@/lib/types';
import WorkspacePage, { filterWorkspaceItems } from './page';

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
  type: 'SHARED',
  currency: 'TRY',
  ownerId: 'me',
  role: 'OWNER',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-08-25T00:00:00Z',
  archivedAt: null,
  activeMemberCount: 3,
  activePlanCount: 1,
};
const plan: Plan = {
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

describe('Defterler & Planlar workspace', () => {
  beforeEach(() => {
    jest.mocked(useLedgers).mockReturnValue({
      data: [ledger],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useLedgers>);
    jest.mocked(useAllPlans).mockReturnValue({
      data: [plan],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useAllPlans>);
  });

  it('loads each collection once and renders both kinds in one ordered grid', () => {
    render(<WorkspacePage />);
    expect(useLedgers).toHaveBeenCalledWith(true);
    expect(useAllPlans).toHaveBeenCalledWith(true);
    expect(
      document.querySelector('a[href="/ledgers/ledger-1"]'),
    ).toBeInTheDocument();
    expect(
      document.querySelector('a[href="/plans/plan-1"]'),
    ).toBeInTheDocument();
  });

  it('searches names and descriptions across both kinds', () => {
    render(<WorkspacePage />);
    fireEvent.change(screen.getByLabelText('Defter ve planlarda ara'), {
      target: { value: 'sahil' },
    });
    expect(
      document.querySelector('a[href="/ledgers/ledger-1"]'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Yaz tatili/ }),
    ).toBeInTheDocument();
  });

  it('uses truthful active and archived filters', () => {
    expect(
      filterWorkspaceItems(
        [ledger],
        [{ ...plan, status: 'COMPLETED' }],
        'active',
        'all',
        '',
      ),
    ).toEqual([expect.objectContaining({ kind: 'ledger' })]);
    expect(
      filterWorkspaceItems(
        [{ ...ledger, archivedAt: '2026-08-26T00:00:00Z' }],
        [{ ...plan, status: 'ARCHIVED' }],
        'archived',
        'all',
        '',
      ),
    ).toHaveLength(2);
  });
});
