import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PlanWorkspaceDialog } from './plan-workspace-dialog';

const back = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ back }),
}));

describe('PlanWorkspaceDialog', () => {
  beforeEach(() => back.mockReset());

  it('uses dialog semantics and closes with its explicit control or Escape', async () => {
    render(
      <div>
        <button type="button">Plan kartı</button>
        <PlanWorkspaceDialog>
          <h1>Hafta sonu planı</h1>
          <button type="button">Plan işlemi</button>
        </PlanWorkspaceDialog>
      </div>,
    );

    const dialog = screen.getByRole('dialog', {
      name: 'Plan çalışma alanı',
    });
    const close = screen.getByRole('button', {
      name: 'Plan çalışma alanını kapat',
    });

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    await waitFor(() => expect(close).toHaveFocus());
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(back).toHaveBeenCalledTimes(1);
    fireEvent.click(close);
    expect(back).toHaveBeenCalledTimes(2);
  });
});
