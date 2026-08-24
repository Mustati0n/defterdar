'use client';

import { useRef, useState } from 'react';
import { ArrowRight, WalletCards } from 'lucide-react';
import { formatMoneyFromMinor } from '@/lib/format';
import { parseMoneyToMinor } from '@/lib/money';
import { remainingAfterPayment } from './financial-ux';
import { useModalDialog } from '@/components/ui/use-modal-dialog';

export interface PaymentDraft {
  amountMinor: number;
  settledAt: string;
  note: string | null;
}

export function PaymentDialog({
  open,
  fromName,
  toName,
  maximumMinor,
  currency,
  pending,
  serverError,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  fromName: string;
  toName: string;
  maximumMinor: number;
  currency: string;
  pending: boolean;
  serverError: string | null;
  onCancel: () => void;
  onSubmit: (draft: PaymentDraft) => void;
}) {
  if (!open) return null;
  return (
    <PaymentDialogContent
      fromName={fromName}
      toName={toName}
      maximumMinor={maximumMinor}
      currency={currency}
      pending={pending}
      serverError={serverError}
      onCancel={onCancel}
      onSubmit={onSubmit}
    />
  );
}

function PaymentDialogContent({
  fromName,
  toName,
  maximumMinor,
  currency,
  pending,
  serverError,
  onCancel,
  onSubmit,
}: Omit<Parameters<typeof PaymentDialog>[0], 'open'>) {
  const [amount, setAmount] = useState(
    `${Math.floor(maximumMinor / 100)},${String(maximumMinor % 100).padStart(2, '0')}`,
  );
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const handleDialogKeyDown = useModalDialog({
    open: true,
    onClose: onCancel,
    dialogRef,
    initialFocusRef: amountRef,
  });
  const amountMinor = parseMoneyToMinor(amount) ?? 0;
  const remaining = remainingAfterPayment(maximumMinor, amountMinor);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (amountMinor <= 0) return setError('Sıfırdan büyük bir tutar yaz.');
    if (amountMinor > maximumMinor)
      return setError(
        `En fazla ${formatMoneyFromMinor(maximumMinor, currency)} ödeme kaydedebilirsin.`,
      );
    onSubmit({
      amountMinor,
      settledAt: new Date(`${date}T12:00:00`).toISOString(),
      note: note.trim() || null,
    });
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className="dialog-card payment-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-dialog-title"
        aria-describedby="payment-dialog-description"
        onKeyDown={handleDialogKeyDown}
      >
        <span className="eyebrow">Defterdar içi kayıt</span>
        <h2 id="payment-dialog-title">Ödeme kaydet</h2>
        <p id="payment-dialog-description">
          Bu işlem para göndermez; yaptığın ödemeyi Defterde kayıt altına alır.
        </p>
        <div
          className="payment-direction"
          aria-label={`${fromName}, ${toName} kişisine ödeme yapıyor`}
        >
          <strong>{fromName}</strong>
          <ArrowRight aria-hidden="true" />
          <strong>{toName}</strong>
        </div>
        <form className="stack-form" onSubmit={submit}>
          <label className="field">
            <span>Tutar</span>
            <div className="money-field">
              <input
                ref={amountRef}
                className="input"
                inputMode="decimal"
                aria-label="Tutar"
                aria-invalid={Boolean(error || serverError)}
                aria-describedby={`payment-amount-help${error || serverError ? ' payment-error' : ''}`}
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value);
                  setError(null);
                }}
              />
              <strong>{currency}</strong>
            </div>
            <small id="payment-amount-help">
              En fazla {formatMoneyFromMinor(maximumMinor, currency)}
            </small>
          </label>
          <label className="field">
            <span>Tarih</span>
            <input
              className="input"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <label className="field">
            <span>
              Not <em>isteğe bağlı</em>
            </span>
            <textarea
              className="input"
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Örn. Elden ödendi"
            />
          </label>
          {amountMinor > 0 && amountMinor <= maximumMinor ? (
            <div className="payment-preview">
              <WalletCards />
              <span>
                Bu kayıttan sonra yaklaşık{' '}
                <strong>{formatMoneyFromMinor(remaining, currency)}</strong>{' '}
                ödemen kalacak.
              </span>
            </div>
          ) : null}
          {error || serverError ? (
            <div className="form-error" id="payment-error" role="alert">
              {error ?? serverError}
            </div>
          ) : null}
          <div className="dialog-card__actions">
            <button
              className="button button--quiet"
              type="button"
              onClick={onCancel}
            >
              Vazgeç
            </button>
            <button
              className="button button--primary"
              type="submit"
              disabled={pending}
            >
              {pending ? 'Kaydediliyor…' : 'Ödendi'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
