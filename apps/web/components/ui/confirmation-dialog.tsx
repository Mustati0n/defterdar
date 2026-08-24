'use client';

import { useRef } from 'react';
import { useModalDialog } from './use-modal-dialog';

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel,
  danger = false,
  pending = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const handleDialogKeyDown = useModalDialog({
    open,
    onClose: onCancel,
    dialogRef,
    initialFocusRef: cancelRef,
  });
  if (!open) return null;

  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className="dialog-card dialog-card--compact"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
        onKeyDown={handleDialogKeyDown}
      >
        <h2 id="confirm-title">{title}</h2>
        <p id="confirm-description">{description}</p>
        <div className="dialog-card__actions">
          <button
            ref={cancelRef}
            className="button button--quiet"
            type="button"
            onClick={onCancel}
          >
            Vazgeç
          </button>
          <button
            className={`button ${danger ? 'button--danger' : 'button--primary'}`}
            type="button"
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? 'İşleniyor…' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
