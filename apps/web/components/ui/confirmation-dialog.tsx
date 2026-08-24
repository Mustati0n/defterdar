'use client';

import {
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';

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
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const close = (event: KeyboardEvent) =>
      event.key === 'Escape' && onCancel();
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onCancel, open]);
  if (!open) return null;

  function trapFocus(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key !== 'Tab') return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className="dialog-card dialog-card--compact"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onKeyDown={trapFocus}
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
