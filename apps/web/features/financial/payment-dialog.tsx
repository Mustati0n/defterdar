'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, WalletCards } from 'lucide-react';
import { formatMoneyFromMinor } from '@/lib/format';
import { parseMoneyToMinor } from '@/lib/money';
import { remainingAfterPayment } from './financial-ux';

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

  useEffect(() => {
    requestAnimationFrame(() => amountRef.current?.focus());
    const close = (event: KeyboardEvent) =>
      event.key === 'Escape' && onCancel();
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onCancel]);
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
        className="dialog-card payment-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-dialog-title"
      >
        <span className="eyebrow">Defterdar içi kayıt</span>
        <h2 id="payment-dialog-title">Ödeme kaydet</h2>
        <p>
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
          <div className="field-row">
            <label className="field">
              <span>Kimden</span>
              <input className="input" value={fromName} disabled />
            </label>
            <label className="field">
              <span>Kime</span>
              <input className="input" value={toName} disabled />
            </label>
          </div>
          <label className="field">
            <span>Tutar</span>
            <div className="money-field">
              <input
                ref={amountRef}
                className="input"
                inputMode="decimal"
                aria-label="Tutar"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value);
                  setError(null);
                }}
              />
              <strong>{currency}</strong>
            </div>
            <small>
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
            <div className="form-error" role="alert">
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
