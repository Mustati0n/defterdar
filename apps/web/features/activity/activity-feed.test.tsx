import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { api } from '@/lib/api-client';
import { ActivityFeed } from './activity-feed';

const actor = { id: 'user-1', displayName: 'Mustafa' };

describe('ActivityFeed cache isolation', () => {
  afterEach(() => jest.restoreAllMocks());

  it('opens an infinite Plan feed after General preview and paginates without a cache-shape error', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    client.setQueryData(['activity-preview', 'ledger-1'], {
      items: [
        {
          id: 'preview-1',
          actor,
          action: 'expense.created',
          createdAt: '2026-08-24T10:00:00Z',
        },
      ],
      nextCursor: null,
    });
    const activity = jest
      .spyOn(api.ledgers, 'activity')
      .mockResolvedValueOnce({
        items: [
          {
            id: 'feed-1',
            ledgerId: 'ledger-1',
            actorUserId: actor.id,
            actor,
            entityType: 'Expense',
            entityId: 'expense-1',
            action: 'expense.created',
            metadata: {},
            createdAt: '2026-08-24T10:00:00Z',
          },
        ],
        nextCursor: 'cursor-1',
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: 'feed-2',
            ledgerId: 'ledger-1',
            actorUserId: actor.id,
            actor,
            entityType: 'Plan',
            entityId: 'plan-1',
            action: 'plan.updated',
            metadata: {},
            createdAt: '2026-08-23T10:00:00Z',
          },
        ],
        nextCursor: null,
      });

    render(
      <QueryClientProvider client={client}>
        <ActivityFeed ledgerId="ledger-1" planId="plan-1" />
      </QueryClientProvider>,
    );

    expect(await screen.findByText(/harcama ekledi/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Daha fazla göster' }));
    await waitFor(() => expect(activity).toHaveBeenCalledTimes(2));
    expect(activity).toHaveBeenNthCalledWith(
      1,
      'ledger-1',
      20,
      undefined,
      'plan-1',
      expect.any(AbortSignal),
    );
    expect(activity).toHaveBeenNthCalledWith(
      2,
      'ledger-1',
      20,
      'cursor-1',
      'plan-1',
      expect.any(AbortSignal),
    );
    expect(screen.getByText(/plan kaydını değiştirdi/i)).toBeInTheDocument();
  });
});
