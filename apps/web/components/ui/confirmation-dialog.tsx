'use client';

import { useEffect, useRef } from 'react';

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
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const close = (event: KeyboardEvent) =>
      event.key === 'Escape' && onCancel();
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onCancel, open]);
  if (!open) return null;
  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        className="dialog-card dialog-card--compact"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <h2 id="confirm-title">{title}</h2>
        <p>{description}</p>
        <div className="dialog-card__actions">
          <button
            className="button button--quiet"
            type="button"
            onClick={onCancel}
          >
            Vazgeç
          </button>
          <button
            ref={confirmRef}
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
