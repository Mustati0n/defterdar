import { render, screen } from '@testing-library/react';
import type { ActivityItem } from '@/lib/types';
import { OverviewActivityRow } from './overview-activity-row';

const payment: ActivityItem = {
  id: 'activity-1',
  ledgerId: 'ledger-1',
  planId: null,
  actorUserId: 'user-1',
  actor: { id: 'user-1', displayName: 'Sako' },
  entityType: 'Settlement',
  entityId: 'settlement-1',
  action: 'payment.marked_paid',
  metadata: { amountMinor: '50000', currency: 'TRY' },
  createdAt: '2026-09-04T11:05:00Z',
};

describe('OverviewActivityRow', () => {
  it('presents actor, context, event, time, amount and text status', () => {
    render(
      <OverviewActivityRow
        contextName="1013"
        item={payment}
        referenceTime={new Date('2026-09-04T12:00:00Z').getTime()}
      />,
    );

    const row = screen.getByRole('link', { name: /Sako/ });
    expect(row).toHaveAttribute('href', '/ledgers/ledger-1');
    expect(screen.getByText('1013')).toBeInTheDocument();
    expect(screen.getByText(/ödemeyi yaptığını bildirdi/)).toBeInTheDocument();
    expect(screen.getByText('₺500,00')).toBeInTheDocument();
    expect(screen.getByText('Onay bekliyor')).toBeInTheDocument();
    expect(screen.getByText(/Bugün,/)).toBeInTheDocument();
  });

  it('links an expense directly without inventing an amount or status', () => {
    render(
      <OverviewActivityRow
        contextName="Ev"
        item={{
          ...payment,
          id: 'activity-2',
          entityId: 'expense-1',
          entityType: 'Expense',
          action: 'expense.created',
          metadata: {},
        }}
        referenceTime={new Date('2026-09-05T12:00:00Z').getTime()}
      />,
    );

    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/expenses/expense-1',
    );
    expect(screen.getByText(/harcama ekledi/)).toBeInTheDocument();
    expect(screen.getByText(/Dün,/)).toBeInTheDocument();
    expect(screen.queryByText(/Onay/)).not.toBeInTheDocument();
    expect(screen.queryByText(/₺/)).not.toBeInTheDocument();
  });
});
