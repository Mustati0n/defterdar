import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  useCategories,
  useCreateExpense,
  useLedgers,
  usePlan,
  usePlans,
} from '@/features/data/hooks';
import { ExpenseForm } from './expense-form';

const push = jest.fn();
const mutateAsync = jest.fn();
const requestedScope = { ledgerId: 'ledger-1', planId: '' };

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => ({
    get: (key: 'ledgerId' | 'planId') => requestedScope[key],
  }),
}));
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: jest.fn(),
}));
jest.mock('@/features/data/hooks', () => ({
  useCategories: jest.fn(),
  useCreateExpense: jest.fn(),
  useLedgers: jest.fn(),
  usePlan: jest.fn(),
  usePlans: jest.fn(),
  queryKeys: {
    members: (ledgerId: string) => ['members', ledgerId],
    participants: (planId: string) => ['participants', planId],
  },
}));
jest.mock('@/features/auth/auth-provider', () => ({
  useAuth: () => ({ user: { id: 'me', displayName: 'Ece' } }),
}));
jest.mock('@/components/ui/toast', () => ({ useToast: () => jest.fn() }));
jest.mock('@/features/data/financial-invalidation', () => ({
  invalidateFinancialData: jest.fn(),
}));

const ledger = {
  id: 'ledger-1',
  name: 'Ev',
  description: null,
  currency: 'TRY',
  ownerId: 'me',
  role: 'OWNER' as const,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  archivedAt: null,
  isCollaborative: true,
};

function setup(presentation: 'page' | 'wizard' = 'page') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<ExpenseForm presentation={presentation} />, { wrapper });
}

describe('simple-first Expense form', () => {
  beforeEach(() => {
    requestedScope.ledgerId = 'ledger-1';
    requestedScope.planId = '';
    push.mockClear();
    mutateAsync.mockReset().mockResolvedValue({ id: 'expense-1' });
    jest
      .mocked(useLedgers)
      .mockReturnValue({ data: [ledger] } as unknown as ReturnType<
        typeof useLedgers
      >);
    jest
      .mocked(usePlans)
      .mockReturnValue({ data: [] } as unknown as ReturnType<typeof usePlans>);
    jest
      .mocked(usePlan)
      .mockReturnValue({ data: undefined } as unknown as ReturnType<
        typeof usePlan
      >);
    jest.mocked(useCategories).mockReturnValue({
      data: [],
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useCategories>);
    jest.mocked(useCreateExpense).mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateExpense>);
    jest.mocked(useQuery).mockImplementation((options) => {
      const key = options.queryKey as unknown[];
      return {
        data:
          key[0] === 'members'
            ? [
                { user: { id: 'me', displayName: 'Ece' }, role: 'OWNER' },
                { user: { id: 'ada', displayName: 'Ada' }, role: 'MEMBER' },
              ]
            : [],
      } as ReturnType<typeof useQuery>;
    });
  });

  it('defaults payer, participants and split for the short path', async () => {
    setup();
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: /Ece \(sen\)/ })).toBeChecked(),
    );
    expect(screen.getByRole('radio', { name: /Eşit böl/ })).toBeChecked();
    for (const input of screen.getAllByRole('checkbox', { name: /Ece|Ada/ })) {
      expect(input).toBeChecked();
    }
    fireEvent.change(screen.getByLabelText('Harcama'), {
      target: { value: 'Market' },
    });
    fireEvent.change(screen.getByLabelText('Harcama tutarı'), {
      target: { value: '120' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Harcamayı kaydet/ }));
    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          ledgerId: 'ledger-1',
          input: expect.objectContaining({
            payerUserId: 'me',
            split: {
              method: 'EQUAL',
              participantUserIds: ['me', 'ada'],
            },
          }),
        }),
      ),
    );
  });

  it('moves the quick create flow through three focused wizard steps', async () => {
    setup('wizard');
    expect(
      screen.getByRole('navigation', { name: 'Harcama adımları' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Ödemeyi yapan')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Harcama'), {
      target: { value: 'Market' },
    });
    fireEvent.change(screen.getByLabelText('Harcama tutarı'), {
      target: { value: '120' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Devam/ }));
    await screen.findByText('Ödemeyi yapan');
    fireEvent.click(screen.getByRole('button', { name: /Devam/ }));
    await screen.findByText('Paylaştırma biçimi');
    fireEvent.click(screen.getByRole('button', { name: /Harcamayı kaydet/ }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
  });

  it('collapses advanced methods by default and retains EXACT behavior', async () => {
    setup();
    const disclosure = screen
      .getByText('Paylaşımı değiştir')
      .closest('details');
    expect(disclosure).not.toHaveAttribute('open');
    fireEvent.click(screen.getByText('Paylaşımı değiştir'));
    fireEvent.click(screen.getByRole('radio', { name: /Tutar gir/ }));
    await waitFor(() =>
      expect(screen.getByLabelText('Ece payı')).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByLabelText('Harcama'), {
      target: { value: 'Market' },
    });
    fireEvent.change(screen.getByLabelText('Harcama tutarı'), {
      target: { value: '120' },
    });
    fireEvent.change(screen.getByLabelText('Ece payı'), {
      target: { value: '60' },
    });
    fireEvent.change(screen.getByLabelText('Ada payı'), {
      target: { value: '60' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Harcamayı kaydet/ }));
    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            split: {
              method: 'EXACT',
              entries: [
                { userId: 'me', amountMinor: 6000 },
                { userId: 'ada', amountMinor: 6000 },
              ],
            },
          }),
        }),
      ),
    );
  });

  it('associates core validation errors with their controls', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Harcamayı kaydet/ }));

    await screen.findByText('Harcamaya kısa bir ad ver.');
    const title = screen.getByLabelText('Harcama');
    const amount = screen.getByLabelText('Harcama tutarı');
    expect(title).toHaveAttribute('aria-invalid', 'true');
    expect(amount).toHaveAttribute('aria-invalid', 'true');

    const titleErrorId = title.getAttribute('aria-describedby');
    const amountDescriptions = amount
      .getAttribute('aria-describedby')
      ?.split(/\s+/);
    expect(titleErrorId).toBeTruthy();
    expect(amountDescriptions).toContain('expense-amount-help');
    expect(amountDescriptions).toContain('expense-amount-error');
    expect(document.getElementById(titleErrorId!)).toHaveAttribute(
      'role',
      'alert',
    );
    expect(document.getElementById('expense-amount-error')).toHaveAttribute(
      'role',
      'alert',
    );
  });

  it('creates an Expense directly in a standalone Plan', async () => {
    requestedScope.ledgerId = '';
    requestedScope.planId = 'plan-standalone';
    jest.mocked(usePlan).mockReturnValue({
      data: {
        id: 'plan-standalone',
        name: 'Roma',
        scope: 'STANDALONE',
        ledgerId: null,
        currency: 'EUR',
      },
    } as unknown as ReturnType<typeof usePlan>);
    jest.mocked(useQuery).mockImplementation((options) => {
      const key = options.queryKey as unknown[];
      return {
        data:
          key[0] === 'participants'
            ? [
                { user: { id: 'me', displayName: 'Ece' } },
                { user: { id: 'ada', displayName: 'Ada' } },
              ]
            : [],
      } as ReturnType<typeof useQuery>;
    });

    setup();
    await waitFor(() =>
      expect(screen.getByText(/Roma içinde oluşturulacak/)).toBeInTheDocument(),
    );
    expect(screen.getByText('EUR')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Harcama'), {
      target: { value: 'Tren' },
    });
    fireEvent.change(screen.getByLabelText('Harcama tutarı'), {
      target: { value: '80' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Harcamayı kaydet/ }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          ledgerId: null,
          input: expect.objectContaining({ planId: 'plan-standalone' }),
        }),
      ),
    );
  });
});
