import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useLedger, usePlan } from '@/features/data/hooks';
import {
  availableFloatingActions,
  FloatingQuickAdd,
} from './floating-quick-add';

let pathname = '/overview';

jest.mock('next/navigation', () => ({ usePathname: () => pathname }));
jest.mock('@/features/data/hooks', () => ({
  useLedger: jest.fn(),
  usePlan: jest.fn(),
}));

describe('FloatingQuickAdd', () => {
  beforeEach(() => {
    pathname = '/overview';
    jest.mocked(useLedger).mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useLedger>);
    jest.mocked(usePlan).mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof usePlan>);
  });

  it('selects context-safe actions', () => {
    expect(
      availableFloatingActions({
        planId: 'plan-1',
        planActive: true,
        ledgerArchived: false,
      }),
    ).toEqual(['expense', 'income']);
    expect(
      availableFloatingActions({
        ledgerId: 'ledger-1',
        planActive: false,
        ledgerArchived: false,
      }),
    ).toEqual(['expense', 'income', 'plan']);
  });

  it('opens on desktop hover and returns focus after Escape', () => {
    render(<FloatingQuickAdd />);
    const trigger = screen.getByRole('button', {
      name: /Oluştur menüsünü aç/,
    });
    fireEvent.mouseEnter(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('menuitem', { name: /Harcama ekle/ }),
    ).toHaveAttribute('href', '/expenses/new');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menuitem', { name: /Harcama ekle/ })).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('hands a quick action to the modal host without navigating', () => {
    const onAction = jest.fn();
    render(<FloatingQuickAdd onAction={onAction} />);
    const trigger = screen.getByRole('button', {
      name: /Oluştur menüsünü aç/,
    });
    fireEvent.mouseEnter(trigger);
    fireEvent.click(screen.getByRole('menuitem', { name: /Harcama ekle/ }));
    expect(onAction).toHaveBeenCalledWith('expense', {});
  });

  it('preselects a standalone Plan and hides unrelated creation actions', () => {
    pathname = '/plans/plan-1';
    jest.mocked(usePlan).mockReturnValue({
      data: { id: 'plan-1', ledgerId: null, status: 'ACTIVE' },
    } as unknown as ReturnType<typeof usePlan>);
    render(<FloatingQuickAdd />);
    fireEvent.click(
      screen.getByRole('button', { name: /Oluştur menüsünü aç/ }),
    );
    expect(
      screen.getByRole('menuitem', { name: /Harcama ekle/ }),
    ).toHaveAttribute('href', '/expenses/new?planId=plan-1');
    expect(screen.queryByRole('menuitem', { name: /Plan oluştur/ })).toBeNull();
  });

  it('exposes the global actions in their product order', () => {
    render(<FloatingQuickAdd />);
    fireEvent.click(
      screen.getByRole('button', { name: /Oluştur menüsünü aç/ }),
    );
    expect(
      screen.getAllByRole('menuitem').map((item) => item.textContent?.trim()),
    ).toEqual(['Harcama ekle', 'Gelir ekle', 'Defter oluştur', 'Plan oluştur']);
  });

  it('supports arrow navigation inside the create menu', async () => {
    render(<FloatingQuickAdd />);
    const trigger = screen.getByRole('button', {
      name: /Oluştur menüsünü aç/,
    });
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    const items = screen.getAllByRole('menuitem');
    await waitFor(() => expect(items[0]).toHaveFocus());
    fireEvent.keyDown(items[0]!, { key: 'ArrowDown' });
    expect(items[1]).toHaveFocus();
    fireEvent.keyDown(items[1]!, { key: 'ArrowUp' });
    expect(items[0]).toHaveFocus();
  });
});
