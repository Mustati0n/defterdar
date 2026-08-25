import { fireEvent, render, screen } from '@testing-library/react';
import { useLedgers } from '@/features/data/hooks';
import { QuickActionDialog } from './quick-action-dialog';

jest.mock('@/features/data/hooks', () => ({ useLedgers: jest.fn() }));
jest.mock('@/features/forms/lazy-route-form', () => ({
  LazyRouteForm: ({ kind }: { kind: string }) => <div>{kind} formu</div>,
}));
jest.mock('@/features/ledgers/create-ledger-dialog', () => ({
  CreateLedgerDialog: () => <div>Defter dialogu</div>,
}));
jest.mock('@/features/plans/create-plan-dialog', () => ({
  CreatePlanDialog: () => <div>Plan dialogu</div>,
}));

describe('QuickActionDialog', () => {
  beforeEach(() => {
    jest.mocked(useLedgers).mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useLedgers>);
  });

  it('does not fetch Ledgers while the modal host is idle', () => {
    render(<QuickActionDialog action={null} onClose={jest.fn()} />);
    expect(useLedgers).not.toHaveBeenCalled();
  });

  it('opens the Expense flow as a modal and closes accessibly', () => {
    const onClose = jest.fn();
    render(
      <QuickActionDialog
        action={{ kind: 'expense', context: { ledgerId: 'ledger-1' } }}
        onClose={onClose}
      />,
    );
    expect(
      screen.getByRole('dialog', { name: 'Harcama ekle' }),
    ).toBeInTheDocument();
    expect(screen.getByText('expense formu')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pencereyi kapat' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('loads Ledgers only when Plan creation needs them', () => {
    render(
      <QuickActionDialog
        action={{ kind: 'plan', context: {} }}
        onClose={jest.fn()}
      />,
    );
    expect(useLedgers).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Plan dialogu')).toBeInTheDocument();
  });
});
