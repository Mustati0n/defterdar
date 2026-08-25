import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { ConfirmationDialog } from './confirmation-dialog';

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Kaydı sil
      </button>
      <ConfirmationDialog
        open={open}
        title="Kayıt silinsin mi?"
        description="Bu işlem geri alınamaz."
        confirmLabel="Sil"
        danger
        onCancel={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
      />
    </div>
  );
}

describe('ConfirmationDialog focus management', () => {
  it('traps focus, closes with Escape and restores the trigger', async () => {
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Kaydı sil' });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole('alertdialog');
    const cancel = screen.getByRole('button', { name: 'Vazgeç' });
    const confirm = screen.getByRole('button', { name: 'Sil' });

    await waitFor(() => expect(cancel).toHaveFocus());
    expect(trigger.inert).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(cancel, { key: 'Tab', shiftKey: true });
    expect(confirm).toHaveFocus();
    fireEvent.keyDown(confirm, { key: 'Tab' });
    expect(cancel).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(trigger.inert).not.toBe(true);
    expect(document.body.style.overflow).toBe('');
  });
});
