import { fireEvent, render, screen } from '@testing-library/react';
import { PaymentApprovalSummary } from './payment-approval-summary';
import type { Settlement } from '@/lib/types';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function settlement(
  id: string,
  amountMinor: string,
  overrides: Partial<Settlement> = {},
): Settlement {
  return {
    id,
    ledgerId: 'ledger-1',
    planId: null,
    fromUserId: 'payer',
    toUserId: 'me',
    fromUser: { id: 'payer', displayName: 'Can' },
    toUser: { id: 'me', displayName: 'Ece' },
    amountMinor,
    currency: 'TRY',
    note: null,
    settledAt: '2026-09-07',
    createdById: 'payer',
    createdAt: '2026-09-07',
    status: 'PENDING',
    confirmedById: null,
    confirmedBy: null,
    confirmedAt: null,
    rejectedById: null,
    rejectedBy: null,
    rejectedAt: null,
    cancelledAt: null,
    voidedAt: null,
    ...overrides,
  };
}

const baseProps = {
  currentUserId: 'me',
  currency: 'TRY',
  accountHref: '/hesap#payment-approvals',
  isLoading: false,
  isError: false,
  onRetry: jest.fn(),
};

describe('PaymentApprovalSummary', () => {
  it('shows only incoming pending approvals and their exact total impact', () => {
    render(
      <PaymentApprovalSummary
        {...baseProps}
        settlements={[
          settlement('one', '10000'),
          settlement('two', '7500'),
          settlement('confirmed', '9000', { status: 'CONFIRMED' }),
          settlement('outgoing', '3000', {
            fromUserId: 'me',
            toUserId: 'payer',
          }),
        ]}
      />,
    );

    expect(
      screen.getByText('2 yeni hareket senden onay bekliyor.'),
    ).toBeVisible();
    expect(screen.getByText(/175/)).toBeVisible();
    expect(screen.getAllByText('Can ödeme bildirdi')).toHaveLength(2);
    expect(screen.getByRole('link', { name: /İncele/ })).toHaveAttribute(
      'href',
      '/hesap#payment-approvals',
    );
  });

  it('stays absent when the user has nothing to approve', () => {
    const { container } = render(
      <PaymentApprovalSummary {...baseProps} settlements={[]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('offers an honest retry state when approvals cannot be checked', () => {
    const onRetry = jest.fn();
    render(
      <PaymentApprovalSummary
        {...baseProps}
        settlements={undefined}
        isError
        onRetry={onRetry}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Tekrar dene/ }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
