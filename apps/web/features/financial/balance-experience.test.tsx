import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/toast';
import { api, ApiError } from '@/lib/api-client';
import type { BalanceResponse, Settlement } from '@/lib/types';
import { BalanceExperience } from './balance-experience';

const payableBalance: BalanceResponse = {
  currency: 'TRY',
  positions: [
    { user: { id: 'me', displayName: 'Mustafa' }, netMinor: -30000 },
    { user: { id: 'ada', displayName: 'Ada' }, netMinor: 30000 },
  ],
  suggestions: [{ fromUserId: 'me', toUserId: 'ada', amountMinor: 30000 }],
};

const settlement: Settlement = {
  id: 'settlement-1',
  ledgerId: 'ledger-1',
  planId: null,
  fromUserId: 'me',
  toUserId: 'ada',
  fromUser: { id: 'me', displayName: 'Mustafa' },
  toUser: { id: 'ada', displayName: 'Ada' },
  amountMinor: '10000',
  currency: 'TRY',
  note: 'Elden',
  settledAt: '2026-08-23T12:00:00Z',
  createdById: 'me',
  createdAt: '2026-08-23T12:00:00Z',
  voidedAt: null,
};

function setup(
  balance: BalanceResponse = payableBalance,
  extra: Partial<React.ComponentProps<typeof BalanceExperience>> = {},
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
  render(
    <BalanceExperience
      scope="ledger"
      ledgerId="ledger-1"
      balance={balance}
      isLoading={false}
      isError={false}
      onRetry={jest.fn()}
      currentUserId="me"
      role="MEMBER"
      {...extra}
    />,
    { wrapper },
  );
  return { client, invalidate };
}

describe('BalanceExperience', () => {
  beforeEach(() => {
    jest.spyOn(api.settlements, 'list').mockResolvedValue([]);
    jest.spyOn(api.settlements, 'create').mockResolvedValue(settlement);
    jest
      .spyOn(api.settlements, 'void')
      .mockResolvedValue({ ...settlement, voidedAt: '2026-08-24T12:00:00Z' });
  });
  afterEach(() => jest.restoreAllMocks());

  it('renders receivable, payable and closed states with text rather than color alone', () => {
    const { rerender } = render(
      <QueryClientProvider client={new QueryClient()}>
        <ToastProvider>
          <BalanceExperience
            scope="ledger"
            ledgerId="ledger-1"
            balance={{
              ...payableBalance,
              positions: [
                { user: { id: 'me', displayName: 'Mustafa' }, netMinor: 42500 },
              ],
              suggestions: [],
            }}
            isLoading={false}
            isError={false}
            onRetry={jest.fn()}
            currentUserId="me"
            role="MEMBER"
          />
        </ToastProvider>
      </QueryClientProvider>,
    );
    expect(
      screen.getByRole('heading', { name: 'Alacağın var' }),
    ).toBeInTheDocument();
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <ToastProvider>
          <BalanceExperience
            scope="ledger"
            ledgerId="ledger-1"
            balance={payableBalance}
            isLoading={false}
            isError={false}
            onRetry={jest.fn()}
            currentUserId="me"
            role="MEMBER"
          />
        </ToastProvider>
      </QueryClientProvider>,
    );
    expect(
      screen.getByRole('heading', { name: 'Ödemen var' }),
    ).toBeInTheDocument();
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <ToastProvider>
          <BalanceExperience
            scope="ledger"
            ledgerId="ledger-1"
            balance={{ currency: 'TRY', positions: [], suggestions: [] }}
            isLoading={false}
            isError={false}
            onRetry={jest.fn()}
            currentUserId="me"
            role="MEMBER"
          />
        </ToastProvider>
      </QueryClientProvider>,
    );
    expect(screen.getAllByText('Hesaplar kapalı').length).toBeGreaterThan(0);
  });

  it('renders Plan scope and keeps settlement available after completion', () => {
    setup(payableBalance, {
      scope: 'plan',
      planId: 'plan-1',
      planStatus: 'COMPLETED',
    });
    expect(screen.getByText('Bu Planın hesabı')).toBeInTheDocument();
    expect(
      screen.getByText(/Kalan hesapları kapatabilirsin/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /ödeme kaydet/i }),
    ).toBeInTheDocument();
  });

  it('records a full payment and invalidates the authoritative balance', async () => {
    const { invalidate } = setup();
    fireEvent.click(screen.getByRole('button', { name: /ödeme kaydet/i }));
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Ödendi',
      }),
    );
    await waitFor(() =>
      expect(api.settlements.create).toHaveBeenCalledWith(
        'ledger-1',
        expect.objectContaining({
          amountMinor: 30000,
          fromUserId: 'me',
          toUserId: 'ada',
        }),
      ),
    );
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['ledger-balance', 'ledger-1'],
    });
  });

  it('records a partial payment and previews the remainder', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /ödeme kaydet/i }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Tutar'), {
      target: { value: '100' },
    });
    expect(within(dialog).getByText(/200,00/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Ödendi' }));
    await waitFor(() =>
      expect(api.settlements.create).toHaveBeenCalledWith(
        'ledger-1',
        expect.objectContaining({ amountMinor: 10000 }),
      ),
    );
  });

  it('blocks overpayment before creating a financial record', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /ödeme kaydet/i }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Tutar'), {
      target: { value: '301' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Ödendi' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent(/En fazla/);
    expect(api.settlements.create).not.toHaveBeenCalled();
  });

  it('refreshes financial truth after a concurrent 409 without retrying the payment', async () => {
    jest
      .mocked(api.settlements.create)
      .mockRejectedValueOnce(
        new ApiError(
          'Bakiye az önce değişti. Güncel hesabı yeniden yükledik.',
          409,
        ),
      );
    const { invalidate } = setup();
    fireEvent.click(screen.getByRole('button', { name: /ödeme kaydet/i }));
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Ödendi',
      }),
    );
    await waitFor(() =>
      expect(screen.getByText(/Bakiye az önce değişti/)).toBeInTheDocument(),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.settlements.create).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['ledger-balance', 'ledger-1'],
    });
  });

  it('voids an authorized payment record and refreshes balances', async () => {
    jest.mocked(api.settlements.list).mockResolvedValueOnce([settlement]);
    const { invalidate } = setup();
    const action = await screen.findByRole('button', {
      name: 'Ödeme kaydını geri al',
    });
    fireEvent.click(action);
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Kaydı geri al',
      }),
    );
    await waitFor(() =>
      expect(api.settlements.void).toHaveBeenCalledWith('settlement-1'),
    );
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['ledger-balance', 'ledger-1'],
    });
  });
});
