'use client';

import { ArrowLeft, Ban, Gift, Pencil, ReceiptText } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/features/auth/auth-provider';
import {
  useExpense,
  useLedger,
  usePlan,
  useVoidExpense,
} from '@/features/data/hooks';
import { ReceiptPanel } from '@/features/expenses/receipt-panel';
import { ApiError } from '@/lib/api-client';
import { formatMoneyFromMinor, splitMethodLabel } from '@/lib/format';
import { OffsetSplitCard } from '@/features/financial/offset-split-card';

export default function ExpenseDetailPage() {
  const { expenseId } = useParams<{ expenseId: string }>();
  const expense = useExpense(expenseId);
  const ledger = useLedger(expense.data?.ledgerId ?? '');
  const plan = usePlan(expense.data?.planId ?? '');
  const { user } = useAuth();
  const toast = useToast();
  const [confirmVoid, setConfirmVoid] = useState(false);
  const voidMutation = useVoidExpense(expenseId);
  function voidExpense() {
    voidMutation.mutate(undefined, {
      onSuccess: () => {
        setConfirmVoid(false);
        toast('Harcama iptal edildi; kayıt geçmişte görünmeye devam edecek.');
      },
      onError: (error) =>
        toast(
          error instanceof ApiError
            ? error.message
            : 'Harcama iptal edilemedi.',
          'error',
        ),
    });
  }
  if (expense.isLoading) return <LoadingState label="Harcama açılıyor…" />;
  if (expense.isError || !expense.data)
    return (
      <ErrorState
        message="Bu harcamaya erişilemiyor."
        onRetry={() => void expense.refetch()}
      />
    );
  const data = expense.data;
  const canManage =
    ledger.data?.role === 'OWNER' ||
    ledger.data?.role === 'ADMIN' ||
    plan.data?.createdById === user?.id ||
    data.createdById === user?.id;
  const financialRole =
    plan.data?.createdById === user?.id
      ? 'OWNER'
      : (ledger.data?.role ?? 'MEMBER');
  return (
    <>
      <Link
        className="back-link"
        href={
          data.planId ? `/plans/${data.planId}` : `/ledgers/${data.ledgerId}`
        }
      >
        <ArrowLeft /> {data.planId ? "Plan'a dön" : 'Deftere dön'}
      </Link>
      <section
        className={`detail-cover detail-cover--expense${data.voidedAt ? ' is-voided' : ''}`}
      >
        <div>
          <span className="eyebrow eyebrow--light">
            {data.isGift ? 'Ismarla' : 'Harcama'} ·{' '}
            {data.category?.name ?? 'Kategorisiz'}
          </span>
          <h1>{data.title}</h1>
          {data.description ? <p>{data.description}</p> : null}
        </div>
        <div className="expense-total">
          <ReceiptText />
          <strong>
            {formatMoneyFromMinor(data.amountMinor, data.currency)}
          </strong>
          <small>
            {new Date(data.expenseDate).toLocaleDateString('tr-TR')}
          </small>
        </div>
      </section>
      {data.voidedAt ? (
        <div className="status-banner">
          <Ban /> Bu harcama iptal edildi. Okunabilir, ancak değiştirilemez.
        </div>
      ) : null}
      <div className="detail-grid">
        <section className="paper-section">
          <span className="eyebrow">Ödeme</span>
          <h2>{data.payer.displayName} ödedi</h2>
          <dl className="detail-list">
            <div>
              <dt>Paylaştırma</dt>
              <dd>{splitMethodLabel(data.splitMethod)}</dd>
            </div>
            <div>
              <dt>Plan</dt>
              <dd>{data.planId ? 'Plana bağlı' : 'Defter geneli'}</dd>
            </div>
          </dl>
          {data.isGift ? (
            <div className="gift-note">
              <Gift /> Tüm paylar Ismarla olarak geri ödemesizdir.
            </div>
          ) : null}
        </section>
        <section className="paper-section">
          <span className="eyebrow">Paylar</span>
          <h2>Kim ne kadar paylaştı?</h2>
          <div className="split-detail-list">
            {data.splits.map((split) => (
              <OffsetSplitCard
                key={split.id}
                expense={data}
                split={split}
                role={financialRole}
                currentUserId={user?.id ?? ''}
                disabled={Boolean(
                  data.voidedAt ||
                  ledger.data?.archivedAt ||
                  plan.data?.status === 'ARCHIVED',
                )}
              />
            ))}
          </div>
        </section>
      </div>
      {canManage && !data.voidedAt ? (
        <div className="page-actions">
          <Link
            className="button button--primary"
            href={`/expenses/${expenseId}/edit`}
          >
            <Pencil /> Harcamayı düzenle
          </Link>
          <button
            className="button button--danger"
            type="button"
            onClick={() => setConfirmVoid(true)}
          >
            <Ban /> Harcamayı iptal et
          </button>
        </div>
      ) : null}
      <ReceiptPanel
        expenseId={expenseId}
        canManage={Boolean(canManage)}
        disabled={Boolean(data.voidedAt || ledger.data?.archivedAt)}
      />
      <ConfirmationDialog
        open={confirmVoid}
        title="Harcama iptal edilsin mi?"
        description="Kayıt silinmez; iptal edilmiş olarak geçmişte kalır ve bakiyeler yeniden hesaplanır."
        confirmLabel="Harcamayı iptal et"
        danger
        pending={voidMutation.isPending}
        onCancel={() => setConfirmVoid(false)}
        onConfirm={voidExpense}
      />
    </>
  );
}
