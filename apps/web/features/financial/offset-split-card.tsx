'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, RotateCcw, Scissors } from 'lucide-react';
import { useRef, useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { queryKeys } from '@/features/data/hooks';
import { invalidateFinancialData } from '@/features/data/financial-invalidation';
import { api, ApiError } from '@/lib/api-client';
import { formatDate, formatMoneyFromMinor } from '@/lib/format';
import { parseMoneyToMinor } from '@/lib/money';
import { useModalDialog } from '@/components/ui/use-modal-dialog';
import type {
  Expense,
  ExpenseSplit,
  LedgerRole,
  OffsetAvailability,
} from '@/lib/types';
import {
  canManageOffset,
  offsetAfterMinor,
  shouldShowOffsetAction,
} from './offset-ux';

export function OffsetSplitCard({
  expense,
  split,
  role,
  currentUserId,
  disabled,
}: {
  expense: Expense;
  split: ExpenseSplit;
  role: LedgerRole;
  currentUserId: string;
  disabled: boolean;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [voidId, setVoidId] = useState<string | null>(null);
  const availability = useQuery({
    queryKey: queryKeys.offsetAvailability(expense.ledgerId, split.id),
    queryFn: () => api.offsets.availability(split.id),
    enabled: Boolean(
      split.isReimbursable && !expense.isGift && !expense.voidedAt,
    ),
  });
  const canManage = canManageOffset(role, currentUserId, expense);
  const showAction = shouldShowOffsetAction({
    availability: availability.data,
    isGift: expense.isGift,
    isReimbursable: split.isReimbursable,
    canManage,
    disabled,
  });

  async function refresh() {
    await invalidateFinancialData(queryClient, {
      ledgerId: expense.ledgerId,
      planIds: [expense.planId],
      expenseId: expense.id,
      expenses: true,
    });
  }
  const create = useMutation({
    mutationFn: (amountMinor: number) =>
      api.offsets.create(split.id, amountMinor),
    onSuccess: async (created) => {
      setDialogOpen(false);
      setDialogError(null);
      await refresh();
      toast(
        `${formatMoneyFromMinor(created.amountMinor, expense.currency)} mevcut borçtan düşüldü.`,
      );
    },
    onError: async (error) => {
      if (error instanceof ApiError && error.status === 409) {
        await refresh();
        setDialogOpen(false);
        setDialogError(null);
        toast(error.message, 'error');
        return;
      }
      setDialogError(
        error instanceof ApiError
          ? error.message
          : 'Borçtan düş işlemi tamamlanamadı.',
      );
    },
  });
  const reverse = useMutation({
    mutationFn: (offsetId: string) => api.offsets.void(offsetId),
    onSuccess: async () => {
      setVoidId(null);
      await refresh();
      toast('Borçtan düş işlemi geri alındı.');
    },
    onError: (error) =>
      toast(
        error instanceof ApiError ? error.message : 'İşlem geri alınamadı.',
        'error',
      ),
  });

  const history = split.offsets ?? [];
  return (
    <article className="split-finance-card">
      <div className="split-finance-card__main">
        <span className="avatar avatar--paper">
          {split.user.displayName[0]}
        </span>
        <div>
          <strong>{split.user.displayName}</strong>
          <small>
            {expense.isGift
              ? 'Ismarlandı — geri ödeme gerekmiyor.'
              : split.isReimbursable
                ? 'Geri ödenebilir pay'
                : 'Geri ödeme gerekmiyor'}
          </small>
        </div>
        <strong>
          {formatMoneyFromMinor(split.amountMinor, expense.currency)}
        </strong>
      </div>
      {split.isReimbursable && !expense.isGift ? (
        <div className="split-accounting">
          <span>
            <small>Borçtan düşüldü</small>
            <strong>
              {formatMoneyFromMinor(split.offsetAppliedMinor, expense.currency)}
            </strong>
          </span>
          <span>
            <small>Kalan pay</small>
            <strong>
              {formatMoneyFromMinor(
                split.remainingReimbursableMinor,
                expense.currency,
              )}
            </strong>
          </span>
        </div>
      ) : null}
      {showAction ? (
        <button
          className="button button--quiet button--small"
          type="button"
          onClick={() => {
            setDialogError(null);
            setDialogOpen(true);
          }}
        >
          <Scissors /> Borçtan düş
        </button>
      ) : null}
      {history.length ? (
        <details className="offset-history">
          <summary>
            <Check /> Borçtan düş geçmişi
          </summary>
          {history.map((offset) => (
            <div key={offset.id}>
              <span>
                <strong>
                  {formatMoneyFromMinor(offset.amountMinor, expense.currency)}
                </strong>
                <small>
                  {formatDate(offset.createdAt)}
                  {offset.voidedAt ? ' · Geri alındı' : ''}
                </small>
              </span>
              {!offset.voidedAt &&
              !disabled &&
              (canManage || offset.createdById === currentUserId) ? (
                <button
                  className="button button--quiet button--small"
                  type="button"
                  onClick={() => setVoidId(offset.id)}
                >
                  <RotateCcw /> Geri al
                </button>
              ) : null}
            </div>
          ))}
        </details>
      ) : null}
      <OffsetDialog
        open={dialogOpen}
        availability={availability.data}
        userName={split.user.displayName}
        currency={expense.currency}
        pending={create.isPending}
        serverError={dialogError}
        onCancel={() => {
          setDialogOpen(false);
          setDialogError(null);
        }}
        onSubmit={(amountMinor) => create.mutate(amountMinor)}
      />
      <ConfirmationDialog
        open={Boolean(voidId)}
        title="Borçtan düş işlemi geri alınsın mı?"
        description="Bu işlem geri alındığında harcamanın ilgili payı tekrar normal şekilde değerlendirilecek."
        confirmLabel="İşlemi geri al"
        danger
        pending={reverse.isPending}
        onCancel={() => setVoidId(null)}
        onConfirm={() => voidId && reverse.mutate(voidId)}
      />
    </article>
  );
}

function OffsetDialog({
  open,
  ...props
}: {
  open: boolean;
  availability: OffsetAvailability | undefined;
  userName: string;
  currency: string;
  pending: boolean;
  serverError: string | null;
  onCancel: () => void;
  onSubmit: (amountMinor: number) => void;
}) {
  if (!open || !props.availability) return null;
  return <OffsetDialogContent {...props} availability={props.availability} />;
}

function OffsetDialogContent({
  availability,
  userName,
  currency,
  pending,
  serverError,
  onCancel,
  onSubmit,
}: {
  availability: OffsetAvailability;
  userName: string;
  currency: string;
  pending: boolean;
  serverError: string | null;
  onCancel: () => void;
  onSubmit: (amountMinor: number) => void;
}) {
  const maximum = Number(availability.maxOffsetMinor);
  const [amount, setAmount] = useState(
    `${Math.floor(maximum / 100)},${String(maximum % 100).padStart(2, '0')}`,
  );
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const handleDialogKeyDown = useModalDialog({
    open: true,
    onClose: onCancel,
    dialogRef,
    initialFocusRef: inputRef,
  });
  const amountMinor = parseMoneyToMinor(amount) ?? 0;
  const after =
    amountMinor > 0 && amountMinor <= maximum
      ? offsetAfterMinor(availability.priorSuggestionMinor, amountMinor)
      : null;
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (amountMinor <= 0) return setError('Sıfırdan büyük bir tutar yaz.');
    if (amountMinor > maximum)
      return setError(
        `En fazla ${formatMoneyFromMinor(maximum, currency)} Borçtan düşebilirsin.`,
      );
    onSubmit(amountMinor);
  }
  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className="dialog-card offset-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="offset-title"
        aria-describedby="offset-description"
        onKeyDown={handleDialogKeyDown}
      >
        <span className="eyebrow">Gereksiz ödemeyi azalt</span>
        <h2 id="offset-title">Borçtan düş</h2>
        <p id="offset-description">
          Bu payı mevcut borcundan düşerek kalan tutarı günceller.
        </p>
        <div className="offset-story">
          <span>
            <small>Mevcut borcun</small>
            <strong>
              {formatMoneyFromMinor(
                availability.priorSuggestionMinor,
                currency,
              )}
            </strong>
          </span>
          <ArrowRight />
          <span>
            <small>Sonra</small>
            <strong>
              {after === null
                ? '—'
                : `${formatMoneyFromMinor(after.toString(), currency)} borcun kalacak`}
            </strong>
          </span>
        </div>
        <form className="stack-form" onSubmit={submit}>
          <label className="field">
            <span>Bu paydan düşülecek ({userName})</span>
            <div className="money-field">
              <input
                ref={inputRef}
                className="input"
                inputMode="decimal"
                aria-label="Borçtan düşülecek tutar"
                aria-invalid={Boolean(error || serverError)}
                aria-describedby={`offset-amount-help${error || serverError ? ' offset-error' : ''}`}
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value);
                  setError(null);
                }}
              />
              <strong>{currency}</strong>
            </div>
            <small id="offset-amount-help">
              En fazla{' '}
              {formatMoneyFromMinor(availability.maxOffsetMinor, currency)}
            </small>
          </label>
          {error || serverError ? (
            <div className="form-error" id="offset-error" role="alert">
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
              {pending ? 'Uygulanıyor…' : 'Borçtan düş'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
