'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  CircleHelp,
  History,
  RotateCcw,
  WalletCards,
} from 'lucide-react';
import { useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { queryKeys } from '@/features/data/hooks';
import { invalidateFinancialData } from '@/features/data/financial-invalidation';
import { api, ApiError } from '@/lib/api-client';
import { formatDate, formatMoneyFromMinor } from '@/lib/format';
import type { BalanceResponse, LedgerRole, Settlement } from '@/lib/types';
import {
  canRecordForSuggestion,
  positionState,
  prioritizeSuggestions,
} from './financial-ux';
import { PaymentDialog, type PaymentDraft } from './payment-dialog';

type Suggestion = BalanceResponse['suggestions'][number];

export function BalanceExperience({
  scope,
  ledgerId,
  planId,
  balance,
  isLoading,
  isError,
  onRetry,
  currentUserId,
  role,
  mutationsDisabled = false,
  planStatus,
}: {
  scope: 'ledger' | 'plan';
  ledgerId: string | null;
  planId?: string;
  balance: BalanceResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  currentUserId: string;
  role: LedgerRole;
  mutationsDisabled?: boolean;
  planStatus?: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [payment, setPayment] = useState<Suggestion | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [voidTarget, setVoidTarget] = useState<Settlement | null>(null);
  const settlements = useQuery({
    queryKey: ledgerId
      ? queryKeys.settlements(ledgerId, planId)
      : queryKeys.planSettlements(planId ?? ''),
    queryFn: ({ signal }) =>
      ledgerId
        ? api.settlements.list(ledgerId, planId, signal)
        : api.settlements.listForPlan(planId ?? '', signal),
    enabled: Boolean(ledgerId || planId),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  async function refreshFinancialTruth() {
    await invalidateFinancialData(queryClient, {
      ledgerId,
      planIds: [planId],
      settlements: true,
    });
  }

  const createSettlement = useMutation({
    mutationFn: ({
      suggestion,
      draft,
    }: {
      suggestion: Suggestion;
      draft: PaymentDraft;
    }) =>
      (ledgerId ? api.settlements.create : api.settlements.createForPlan)(
        ledgerId ?? planId ?? '',
        {
          fromUserId: suggestion.fromUserId,
          toUserId: suggestion.toUserId,
          amountMinor: draft.amountMinor,
          planId: planId ?? null,
          note: draft.note,
          settledAt: draft.settledAt,
        },
      ),
    onSuccess: async () => {
      setPayment(null);
      setPaymentError(null);
      await refreshFinancialTruth();
      toast('Ödeme kaydedildi.');
    },
    onError: async (error) => {
      if (error instanceof ApiError && error.status === 409) {
        await refreshFinancialTruth();
        setPayment(null);
        setPaymentError(null);
        toast(error.message, 'error');
        return;
      }
      setPaymentError(
        error instanceof ApiError ? error.message : 'Ödeme kaydedilemedi.',
      );
    },
  });
  const voidSettlement = useMutation({
    mutationFn: (settlementId: string) => api.settlements.void(settlementId),
    onSuccess: async () => {
      setVoidTarget(null);
      await refreshFinancialTruth();
      toast('Ödeme kaydı geri alındı; bakiyeler güncellendi.');
    },
    onError: (error) =>
      toast(
        error instanceof ApiError
          ? error.message
          : 'Ödeme kaydı geri alınamadı.',
        'error',
      ),
  });

  if (isLoading) return <LoadingState label="Hesaplar çıkarılıyor…" />;
  if (isError || !balance)
    return (
      <ErrorState message="Bakiyeler şu anda yüklenemedi." onRetry={onRetry} />
    );

  const currentPosition = balance.positions.find(
    (item) => item.user.id === currentUserId,
  );
  const currentNet = currentPosition?.netMinor ?? 0;
  const currentState = positionState(currentNet);
  const grouped = prioritizeSuggestions(balance.suggestions, currentUserId);
  const allClosed =
    balance.suggestions.length === 0 &&
    balance.positions.every((position) => position.netMinor === 0);
  const names = new Map(
    balance.positions.map((item) => [item.user.id, item.user.displayName]),
  );
  const canMutate = !mutationsDisabled && planStatus !== 'ARCHIVED';

  const openPayment = (suggestion: Suggestion) => {
    setPaymentError(null);
    setPayment(suggestion);
  };

  return (
    <section
      className="balance-experience detail-full"
      aria-label={scope === 'plan' ? 'Plan bakiyeleri' : 'Defter bakiyeleri'}
    >
      {planStatus === 'COMPLETED' ? (
        <div className="status-banner">
          <CheckCircle2 />
          <span>
            <strong>Plan tamamlandı.</strong> Kalan hesapları kapatabilirsin.
          </span>
        </div>
      ) : null}
      <div
        className={`balance-hero balance-hero--${currentState}`}
        key={`${currentNet}-${String(allClosed)}`}
      >
        <span className="balance-hero__icon" aria-hidden="true">
          {currentState === 'receivable' ? (
            <ArrowDownLeft />
          ) : currentState === 'payable' ? (
            <ArrowUpRight />
          ) : (
            <CheckCircle2 />
          )}
        </span>
        <div>
          <span className="eyebrow">
            {scope === 'plan' ? 'Bu Planın hesabı' : 'Bu Defterdeki hesabın'}
          </span>
          <h2>
            {currentState === 'receivable'
              ? 'Alacağın var'
              : currentState === 'payable'
                ? 'Ödemen var'
                : allClosed
                  ? 'Hesaplar kapalı'
                  : 'Senin hesabın kapalı'}
          </h2>
          <strong>
            {currentState === 'closed'
              ? '✓'
              : formatMoneyFromMinor(Math.abs(currentNet), balance.currency)}
          </strong>
          <p>
            {currentState === 'closed'
              ? allClosed
                ? 'Şu anda kimsenin kimseye ödemesi yok.'
                : 'Senin yapman gereken ödeme yok; grubun diğer hesapları aşağıda.'
              : currentState === 'receivable'
                ? 'Sana yapılacak ödemeleri aşağıda görebilirsin.'
                : 'Yapman gereken ödemeleri aşağıda görebilirsin.'}
          </p>
        </div>
      </div>

      {balance.suggestions.length ? (
        <section className="paper-section settlement-suggestions">
          <div className="section-heading">
            <div>
              <span className="eyebrow">En sade yol</span>
              <h2>Hesabı kapatmak için</h2>
            </div>
            <details className="help-popover">
              <summary>
                <CircleHelp /> Nasıl sadeleşti?
              </summary>
              <p>
                Defterdar, gereksiz karşılıklı ödemeleri azaltarak daha basit
                öneriler gösterir. Bu öneriler geçmiş harcamaları değiştirmez.
              </p>
            </details>
          </div>
          <SuggestionGroup
            title="Senin yapacakların"
            suggestions={grouped.payments}
            names={names}
            currency={balance.currency}
            currentUserId={currentUserId}
            role={role}
            canMutate={canMutate}
            onPay={openPayment}
          />
          <SuggestionGroup
            title="Sana yapılacak ödemeler"
            suggestions={grouped.receivables}
            names={names}
            currency={balance.currency}
            currentUserId={currentUserId}
            role={role}
            canMutate={canMutate}
            onPay={openPayment}
          />
          <SuggestionGroup
            title="Grubun diğer hesapları"
            suggestions={grouped.others}
            names={names}
            currency={balance.currency}
            currentUserId={currentUserId}
            role={role}
            canMutate={canMutate}
            onPay={openPayment}
          />
        </section>
      ) : null}

      <section className="paper-section all-positions">
        <span className="eyebrow">Herkesin durumu</span>
        <h2>
          {scope === 'plan' ? 'Plandaki durumlar' : 'Defterdeki durumlar'}
        </h2>
        <div className="position-cards">
          {balance.positions.length ? (
            balance.positions
              .slice()
              .sort(
                (a, b) =>
                  Number(b.user.id === currentUserId) -
                  Number(a.user.id === currentUserId),
              )
              .map((position) => {
                const state = positionState(position.netMinor);
                return (
                  <article key={position.user.id}>
                    <span className="avatar avatar--paper">
                      {position.user.displayName[0]}
                    </span>
                    <div>
                      <strong>
                        {position.user.id === currentUserId
                          ? `${position.user.displayName} (sen)`
                          : position.user.displayName}
                      </strong>
                      <small>
                        {state === 'receivable'
                          ? 'Alacaklı'
                          : state === 'payable'
                            ? 'Ödemesi var'
                            : 'Hesabı kapalı'}
                      </small>
                    </div>
                    <strong
                      className={`position-amount position-amount--${state}`}
                    >
                      {state === 'receivable'
                        ? '+'
                        : state === 'payable'
                          ? '−'
                          : '✓ '}
                      {formatMoneyFromMinor(
                        Math.abs(position.netMinor),
                        balance.currency,
                      )}
                    </strong>
                  </article>
                );
              })
          ) : (
            <div className="closed-balance">
              <CheckCircle2 />
              <div>
                <strong>Hesaplar kapalı</strong>
                <p>Şu anda kimsenin kimseye ödemesi yok.</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="paper-section settlement-history">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Kayıtlar</span>
            <h2>Ödeme geçmişi</h2>
          </div>
          <History />
        </div>
        {settlements.isLoading ? (
          <p className="muted-copy">Ödeme kayıtları yükleniyor…</p>
        ) : settlements.isError ? (
          <div className="form-error">
            Ödeme geçmişi yüklenemedi.{' '}
            <button type="button" onClick={() => void settlements.refetch()}>
              Yeniden dene
            </button>
          </div>
        ) : (
          <div className="history-list">
            {settlements.data?.map((item) => (
              <article
                className={item.voidedAt ? 'is-voided' : ''}
                key={item.id}
              >
                <span className="history-list__stamp">
                  {item.voidedAt ? <RotateCcw /> : <WalletCards />}
                </span>
                <div>
                  <strong>
                    {item.fromUser.displayName}{' '}
                    <ArrowRight aria-label="kişisine" />{' '}
                    {item.toUser.displayName}
                  </strong>
                  <small>
                    {formatDate(item.settledAt)}
                    {item.note ? ` · ${item.note}` : ''}
                  </small>
                  {item.voidedAt ? (
                    <span className="status-chip status-chip--muted">
                      İptal edildi
                    </span>
                  ) : null}
                </div>
                <strong>
                  {formatMoneyFromMinor(item.amountMinor, item.currency)}
                </strong>
                {!item.voidedAt &&
                canMutate &&
                (role === 'OWNER' ||
                  role === 'ADMIN' ||
                  item.createdById === currentUserId) ? (
                  <button
                    className="button button--quiet button--small"
                    type="button"
                    onClick={() => setVoidTarget(item)}
                  >
                    Ödeme kaydını geri al
                  </button>
                ) : null}
              </article>
            ))}
            {!settlements.data?.length ? (
              <div className="inline-note">Henüz ödeme kaydı yok.</div>
            ) : null}
          </div>
        )}
      </section>

      <PaymentDialog
        open={Boolean(payment)}
        fromName={payment ? (names.get(payment.fromUserId) ?? 'Ödeyen') : ''}
        toName={payment ? (names.get(payment.toUserId) ?? 'Alan') : ''}
        maximumMinor={payment?.amountMinor ?? 0}
        currency={balance.currency}
        pending={createSettlement.isPending}
        serverError={paymentError}
        onCancel={() => {
          setPayment(null);
          setPaymentError(null);
        }}
        onSubmit={(draft) =>
          payment && createSettlement.mutate({ suggestion: payment, draft })
        }
      />
      <ConfirmationDialog
        open={Boolean(voidTarget)}
        title="Ödeme kaydı geri alınsın mı?"
        description="Bu ödeme kaydı geçmişten silinmeyecek. Geri alındığında bakiyeler yeniden hesaplanacak."
        confirmLabel="Kaydı geri al"
        danger
        pending={voidSettlement.isPending}
        onCancel={() => setVoidTarget(null)}
        onConfirm={() => voidTarget && voidSettlement.mutate(voidTarget.id)}
      />
    </section>
  );
}

function SuggestionGroup({
  title,
  suggestions,
  names,
  currency,
  currentUserId,
  role,
  canMutate,
  onPay,
}: {
  title: string;
  suggestions: Suggestion[];
  names: Map<string, string>;
  currency: string;
  currentUserId: string;
  role: LedgerRole;
  canMutate: boolean;
  onPay: (suggestion: Suggestion) => void;
}) {
  if (!suggestions.length) return null;
  return (
    <div className="suggestion-group">
      <h3>{title}</h3>
      <div className="suggestion-list">
        {suggestions.map((suggestion) => {
          const from = names.get(suggestion.fromUserId) ?? 'Bir üye';
          const to = names.get(suggestion.toUserId) ?? 'Bir üye';
          return (
            <article
              className="ledger-slip"
              key={`${suggestion.fromUserId}:${suggestion.toUserId}`}
            >
              <div>
                <span className="ledger-slip__route">
                  <strong>
                    {suggestion.fromUserId === currentUserId ? 'Sen' : from}
                  </strong>
                  <ArrowRight aria-label="kişisine ödesin" />
                  <strong>
                    {suggestion.toUserId === currentUserId ? 'Sen' : to}
                  </strong>
                </span>
                <p>
                  {suggestion.fromUserId === currentUserId
                    ? `${to} kişisine ödemen var.`
                    : suggestion.toUserId === currentUserId
                      ? `${from} kişisinden alacağın var.`
                      : `${from}, ${to} kişisine ödesin.`}
                </p>
              </div>
              <strong>
                {formatMoneyFromMinor(suggestion.amountMinor, currency)}
              </strong>
              {canMutate &&
              canRecordForSuggestion(role, currentUserId, suggestion) ? (
                <button
                  className="button button--primary button--small"
                  type="button"
                  aria-label={`${from} kişisinden ${to} kişisine ödeme kaydet`}
                  onClick={() => onPay(suggestion)}
                >
                  Ödendi
                </button>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
