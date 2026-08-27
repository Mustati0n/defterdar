import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/toast';
import { CreateLedgerDialog } from '@/features/ledgers/create-ledger-dialog';
import {
  LedgerMembersPanel,
  LedgerSettingsPanel,
} from '@/features/ledgers/ledger-management';
import { CreatePlanDialog } from '@/features/plans/create-plan-dialog';
import { useCreateLedger, useCreatePlan } from '@/features/data/hooks';
import type { Ledger } from '@/lib/types';

const push = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: jest.fn() }),
}));
jest.mock('@/features/data/hooks', () => ({
  ...jest.requireActual('@/features/data/hooks'),
  useCreateLedger: jest.fn(),
  useCreatePlan: jest.fn(),
}));

const ledger: Ledger = {
  id: 'ledger-1',
  name: 'Ev',
  description: null,
  currency: 'TRY',
  ownerId: 'owner',
  role: 'OWNER',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  archivedAt: null,
  isCollaborative: true,
  activeMemberCount: 2,
};

function providers(children: ReactNode) {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>,
  );
}

describe('Ledger and Plan management flows', () => {
  beforeEach(() => {
    jest.mocked(useCreateLedger).mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue(ledger),
      isPending: false,
    } as unknown as ReturnType<typeof useCreateLedger>);
    jest.mocked(useCreatePlan).mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue({ id: 'plan-1' }),
      isPending: false,
    } as unknown as ReturnType<typeof useCreatePlan>);
  });

  it('creates a Ledger and opens its detail', async () => {
    providers(<CreateLedgerDialog defaultOpen />);
    fireEvent.change(screen.getByLabelText('Defter adı'), {
      target: { value: 'Yeni Ev' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Defteri aç' }));
    await waitFor(() =>
      expect(jest.mocked(useCreateLedger)().mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Yeni Ev', currency: 'TRY' }),
      ),
    );
    expect(push).toHaveBeenCalledWith('/ledgers/ledger-1');
  });

  it('keeps known Ledger context in Plan creation instead of asking twice', async () => {
    providers(
      <CreatePlanDialog
        defaultOpen
        initialLedgerId="ledger-1"
        ledgers={[ledger]}
      />,
    );
    expect(screen.getByText(/Ev içinde oluşturulacak/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Deftere ekle/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Para birimi/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Plan adı'), {
      target: { value: 'Tatil' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Planı ekle' }));
    await waitFor(() =>
      expect(jest.mocked(useCreatePlan)().mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ ledgerId: 'ledger-1' }),
      ),
    );
  });

  it('keeps optional Ledger and currency details out of quick Plan creation', () => {
    providers(<CreatePlanDialog defaultOpen ledgers={[ledger]} />);
    expect(screen.queryByLabelText(/Deftere ekle/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Para birimi/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Daha fazla seçenek' }));

    expect(screen.getByLabelText(/Deftere ekle/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Para birimi/)).toBeInTheDocument();
  });

  it('inherits the selected Ledger currency without submitting a second currency', async () => {
    providers(
      <CreatePlanDialog
        defaultOpen
        ledgers={[{ ...ledger, currency: 'EUR' }]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Daha fazla seçenek' }));
    fireEvent.change(screen.getByLabelText(/Deftere ekle/), {
      target: { value: 'ledger-1' },
    });
    expect(screen.queryByLabelText(/Para birimi/)).not.toBeInTheDocument();
    expect(
      screen.getByText(/Para birimi Defterden gelir: EUR/),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Plan adı'), {
      target: { value: 'Avrupa turu' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Planı ekle' }));
    await waitFor(() =>
      expect(jest.mocked(useCreatePlan)().mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          ledgerId: 'ledger-1',
          input: expect.not.objectContaining({ currency: expect.anything() }),
        }),
      ),
    );
  });

  it('hides invitation and role actions from a MEMBER', () => {
    providers(
      <LedgerMembersPanel
        ledger={{ ...ledger, role: 'MEMBER' }}
        members={[
          {
            user: { id: 'member', displayName: 'Ece' },
            role: 'MEMBER',
            joinedAt: '2026-01-01',
          },
        ]}
      />,
    );
    expect(
      screen.queryByRole('button', { name: /Davet oluştur/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByText('Üye')).toBeInTheDocument();
    expect(screen.queryByText('MEMBER')).not.toBeInTheDocument();
  });

  it('keeps member controls available for a single-person Ledger', () => {
    providers(
      <LedgerMembersPanel
        ledger={{ ...ledger, isCollaborative: false, activeMemberCount: 1 }}
        members={[
          {
            user: { id: 'owner', displayName: 'Ece' },
            role: 'OWNER',
            joinedAt: '2026-01-01',
          },
        ]}
      />,
    );
    expect(screen.getByText('Üyeler ve roller')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Davet oluştur' }),
    ).toBeInTheDocument();
  });

  it('blocks mutation fields for an archived Ledger', () => {
    providers(
      <LedgerSettingsPanel
        ledger={{ ...ledger, archivedAt: '2026-01-02' }}
        members={[]}
      />,
    );
    expect(screen.getByLabelText('Defter adı')).toBeDisabled();
    expect(
      screen.queryByRole('button', { name: /Değişiklikleri kaydet/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Defteri yeniden aç/ }),
    ).toBeInTheDocument();
  });
});
