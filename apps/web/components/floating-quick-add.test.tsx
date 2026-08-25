import { fireEvent, render, screen } from '@testing-library/react';
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
      name: /Hızlı ekle menüsünü aç/,
    });
    fireEvent.mouseEnter(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: /Harcama ekle/ })).toHaveAttribute(
      'href',
      '/expenses/new',
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('link', { name: /Harcama ekle/ })).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('hands a quick action to the modal host without navigating', () => {
    const onAction = jest.fn();
    render(<FloatingQuickAdd onAction={onAction} />);
    const trigger = screen.getByRole('button', {
      name: /Hızlı ekle menüsünü aç/,
    });
    fireEvent.mouseEnter(trigger);
    fireEvent.click(screen.getByRole('link', { name: /Harcama ekle/ }));
    expect(onAction).toHaveBeenCalledWith('expense', {});
  });

  it('preselects a standalone Plan and hides unrelated creation actions', () => {
    pathname = '/plans/plan-1';
    jest.mocked(usePlan).mockReturnValue({
      data: { id: 'plan-1', ledgerId: null, status: 'ACTIVE' },
    } as unknown as ReturnType<typeof usePlan>);
    render(<FloatingQuickAdd />);
    fireEvent.click(
      screen.getByRole('button', { name: /Hızlı ekle menüsünü aç/ }),
    );
    expect(screen.getByRole('link', { name: /Harcama ekle/ })).toHaveAttribute(
      'href',
      '/expenses/new?planId=plan-1',
    );
    expect(screen.queryByRole('link', { name: /Plan oluştur/ })).toBeNull();
  });
});
