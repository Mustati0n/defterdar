import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { api } from '@/lib/api-client';
import type { Ledger, OverviewResponse, Plan } from '@/lib/types';
import {
  useAllPlans,
  useLedgerDetailData,
  useOverview,
  usePlanDetailData,
} from './hooks';

const ledger = {
  id: 'ledger-1',
  name: 'Ev',
  description: null,
  type: 'SHARED',
  currency: 'TRY',
  ownerId: 'me',
  role: 'OWNER',
  createdAt: '2026-08-24T10:00:00Z',
  updatedAt: '2026-08-24T10:00:00Z',
  archivedAt: null,
} satisfies Ledger;

const plan = {
  id: 'plan-1',
  ledgerId: ledger.id,
  name: 'Gezi',
  description: null,
  startsAt: null,
  endsAt: null,
  status: 'ACTIVE',
  createdById: 'me',
  createdAt: '2026-08-24T10:00:00Z',
  updatedAt: '2026-08-24T10:00:00Z',
  archivedAt: null,
  participantCount: 1,
} satisfies Plan;

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false, gcTime: 0 } },
        })
      }
    >
      {children}
    </QueryClientProvider>
  );
}

function OverviewHarness() {
  const query = useOverview();
  return <span>{query.data ? 'overview-ready' : 'loading'}</span>;
}

function PlansHarness() {
  const query = useAllPlans(true);
  return <span>{query.data ? 'plans-ready' : 'loading'}</span>;
}

function LedgerAnalyticsHarness() {
  const query = useLedgerDetailData(ledger.id, 'analytics');
  return <span>{query.ledger.data ? 'ledger-ready' : 'loading'}</span>;
}

function PlanAnalyticsHarness() {
  const query = usePlanDetailData(plan.id, 'analytics');
  return <span>{query.plan.data ? 'plan-ready' : 'loading'}</span>;
}

describe('performance query boundaries', () => {
  afterEach(() => jest.restoreAllMocks());

  it('loads Overview through one aggregate request and forwards AbortSignal', async () => {
    const response: OverviewResponse = {
      ledgers: [ledger],
      plans: [plan],
      ledgerBalances: [],
      planBalances: [],
      activity: null,
    };
    const overview = jest
      .spyOn(api.overview, 'get')
      .mockResolvedValue(response);
    const ledgers = jest.spyOn(api.ledgers, 'list');
    const plans = jest.spyOn(api.plans, 'listAll');

    render(<OverviewHarness />, { wrapper });

    expect(await screen.findByText('overview-ready')).toBeInTheDocument();
    expect(overview).toHaveBeenCalledTimes(1);
    expect(overview).toHaveBeenCalledWith(expect.any(AbortSignal));
    expect(ledgers).not.toHaveBeenCalled();
    expect(plans).not.toHaveBeenCalled();
  });

  it('lists all user Plans with one request independent of Ledger count', async () => {
    const listAll = jest.spyOn(api.plans, 'listAll').mockResolvedValue([plan]);
    const perLedger = jest.spyOn(api.plans, 'list');

    render(<PlansHarness />, { wrapper });

    expect(await screen.findByText('plans-ready')).toBeInTheDocument();
    expect(listAll).toHaveBeenCalledTimes(1);
    expect(perLedger).not.toHaveBeenCalled();
  });

  it('does not fetch closed Ledger detail surfaces on Analytics', async () => {
    jest.spyOn(api.ledgers, 'get').mockResolvedValue(ledger);
    const plans = jest.spyOn(api.plans, 'list');
    const members = jest.spyOn(api.ledgers, 'members');
    const balance = jest.spyOn(api.ledgers, 'balances');
    const activity = jest.spyOn(api.ledgers, 'activity');
    const expenses = jest.spyOn(api.expenses, 'list');
    const incomes = jest.spyOn(api.incomes, 'list');

    render(<LedgerAnalyticsHarness />, { wrapper });

    expect(await screen.findByText('ledger-ready')).toBeInTheDocument();
    expect(plans).not.toHaveBeenCalled();
    expect(members).not.toHaveBeenCalled();
    expect(balance).not.toHaveBeenCalled();
    expect(activity).not.toHaveBeenCalled();
    expect(expenses).not.toHaveBeenCalled();
    expect(incomes).not.toHaveBeenCalled();
  });

  it('does not fetch closed Plan detail surfaces on Analytics', async () => {
    jest.spyOn(api.plans, 'get').mockResolvedValue(plan);
    const participants = jest.spyOn(api.plans, 'participants');
    const balance = jest.spyOn(api.plans, 'balances');
    const expenses = jest.spyOn(api.expenses, 'list');

    render(<PlanAnalyticsHarness />, { wrapper });

    expect(await screen.findByText('plan-ready')).toBeInTheDocument();
    expect(participants).not.toHaveBeenCalled();
    expect(balance).not.toHaveBeenCalled();
    expect(expenses).not.toHaveBeenCalled();
  });
});
