'use client';

import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CheckSquare2,
  Clock3,
  Settings,
  Plus,
  ReceiptText,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  DetailNavigation,
  resolveDetailView,
} from '@/components/detail-navigation';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { usePlanDetailData } from '@/features/data/hooks';
import type { PlanDetailView } from '@/features/data/hooks';
import { useLedger, useLedgers } from '@/features/data/hooks';
import { useAuth } from '@/features/auth/auth-provider';
import { api } from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/features/data/hooks';
import {
  PlanParticipantsPanel,
  PlanLifecycleAction,
  PlanSettingsPanel,
} from '@/features/plans/plan-management';
import { ActivityFeed } from '@/features/activity/activity-feed';
import { ExpenseIndicators } from '@/features/expenses/expense-indicators';
import {
  formatDate,
  formatMoneyFromMinor,
  planStatusLabel,
} from '@/lib/format';
import { BalanceExperience } from '@/features/financial/balance-experience';
import { AnalyticsExperience } from '@/features/analytics/analytics-experience';
import { PageIntro } from '@/features/page-intro/page-intro';

const primaryViews = [
  { id: 'general', label: 'Genel', icon: CheckSquare2 },
  { id: 'balances', label: 'Hesap', icon: WalletCards },
] as const;
const secondaryViews = [
  { id: 'activity', label: 'Hareket geçmişi', icon: Clock3 },
  { id: 'analytics', label: 'İstatistikler', icon: BarChart3 },
  { id: 'participants', label: 'Katılımcılar', icon: UsersRound },
  { id: 'settings', label: 'Ayarlar', icon: Settings },
] as const;
type PlanView =
  (typeof primaryViews)[number]['id'] | (typeof secondaryViews)[number]['id'];

export function planNextStep(
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED',
  participantCount: number,
  expenseCount: number,
) {
  if (status === 'ARCHIVED') return 'Bu Plan arşivde.';
  if (status === 'COMPLETED')
    return 'Plan tamamlandı; hesabı kontrol edebilirsin.';
  if (participantCount < 2) return 'Birlikte kullanacağın katılımcıları ekle.';
  if (expenseCount === 0) return 'İlk harcamayı ekle.';
  return 'Plan hazır olduğunda tamamlayabilirsin.';
}

export default function PlanDetailPage() {
  const { planId } = useParams<{ planId: string }>();
  const searchParams = useSearchParams();
  const requestedView = resolveDetailView(
    searchParams.get('view'),
    [...primaryViews, ...secondaryViews].map((view) => view.id),
    'general',
  ) as PlanDetailView;
  const { plan, participants, balance, expenses } = usePlanDetailData(
    planId,
    requestedView,
  );
  const { user } = useAuth();
  const ledgers = useLedgers(false, requestedView === 'settings');
  const ledger = useLedger(plan.data?.ledgerId ?? '');
  const members = useQuery({
    queryKey: queryKeys.members(plan.data?.ledgerId ?? ''),
    queryFn: ({ signal }) =>
      api.ledgers.members(plan.data?.ledgerId ?? '', signal),
    enabled: Boolean(plan.data?.ledgerId && requestedView === 'participants'),
  });

  if (plan.isLoading) return <LoadingState label="Plan açılıyor…" />;
  if (plan.isError || !plan.data)
    return (
      <ErrorState
        message="Bu plana erişilemiyor ya da plan artık mevcut değil."
        onRetry={() => void plan.refetch()}
      />
    );
  const data = plan.data;
  const canAdmin =
    data.scope === 'STANDALONE'
      ? data.createdById === user?.id
      : ledger.data?.role === 'OWNER' || ledger.data?.role === 'ADMIN';
  const canEdit = canAdmin || data.createdById === user?.id;
  const allowedViews = [...primaryViews, ...secondaryViews].map(
    (view) => view.id,
  ) as PlanView[];
  const activeView = resolveDetailView(
    searchParams.get('view'),
    allowedViews,
    'general',
  );

  return (
    <>
      <Link className="back-link" href="/workspace?type=plan">
        <ArrowLeft /> Planlara dön
      </Link>
      <section className="detail-cover detail-cover--plan">
        <span className="detail-cover__pin" aria-hidden="true" />
        <div>
          <span className="eyebrow">
            {data.scope === 'STANDALONE'
              ? 'Deftere ekli olmayan Plan'
              : 'Deftere bağlı Plan'}{' '}
            · {planStatusLabel(data.status)}
          </span>
          <h1>{data.name}</h1>
          {data.description ? <p>{data.description}</p> : null}
        </div>
        <div className="detail-cover__date">
          <CalendarDays />
          <span>
            <small>Başlangıç</small>
            <strong>{formatDate(data.startsAt, 'Serbest')}</strong>
          </span>
        </div>
      </section>
      <DetailNavigation
        label="Plan bölümleri"
        basePath={`/plans/${planId}`}
        activeView={activeView}
        primary={primaryViews}
        secondary={secondaryViews}
      />

      {activeView === 'general' ? (
        <>
          <div className="page-actions">
            <PlanLifecycleAction plan={data} canEdit={Boolean(canEdit)} />
          </div>
          <div className="detail-grid">
            <section className="paper-section">
              <span className="eyebrow">Plan künyesi</span>
              <h2>Takvim ve katılım</h2>
              <div className="summary-list">
                <div>
                  <UsersRound />
                  <span>
                    <small>Katılımcılar</small>
                    <strong>{data.participantCount}</strong>
                  </span>
                </div>
                <div>
                  <CalendarDays />
                  <span>
                    <small>Bitiş</small>
                    <strong>{formatDate(data.endsAt, 'Açık')}</strong>
                  </span>
                </div>
                <div>
                  <CheckSquare2 />
                  <span>
                    <small>Durum</small>
                    <strong>{planStatusLabel(data.status)}</strong>
                  </span>
                </div>
              </div>
            </section>
            <section className="lined-section">
              <span className="eyebrow">Sıradaki adım</span>
              <h2>Sıradaki adım</h2>
              <p className="context-note">
                {planNextStep(
                  data.status,
                  data.participantCount,
                  expenses.data?.length ?? 0,
                )}
              </p>
            </section>
          </div>
          <section className="paper-section expense-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Plan harcamaları</span>
                <h2>Birlikte ödenenler</h2>
              </div>
            </div>
            {expenses.data?.length ? (
              <div className="expense-list">
                {expenses.data.slice(0, 6).map((expense) => (
                  <Link href={`/expenses/${expense.id}`} key={expense.id}>
                    <span>
                      <ReceiptText />
                    </span>
                    <div>
                      <strong>{expense.title}</strong>
                      <small>
                        {expense.payer.displayName} ödedi ·{' '}
                        {expense.splits.length} kişi paylaştı
                      </small>
                      <ExpenseIndicators expense={expense} />
                    </div>
                    <div>
                      <strong>
                        {formatMoneyFromMinor(
                          expense.amountMinor,
                          expense.currency,
                        )}
                      </strong>
                      <small>
                        {new Date(expense.expenseDate).toLocaleDateString(
                          'tr-TR',
                        )}
                      </small>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="smart-empty smart-empty--expense">
                <span>
                  <ReceiptText />
                </span>
                <div>
                  <h3>Henüz harcama yok.</h3>
                  <p>
                    {data.status === 'ACTIVE'
                      ? 'İlk harcamayı eklediğinde Planın payları ve bakiyeleri burada oluşacak.'
                      : 'Bu Plan tamamlandığı için yeni harcama eklenemez; mevcut kayıtlar okunmaya devam eder.'}
                  </p>
                </div>
                {data.status === 'ACTIVE' ? (
                  <Link
                    className="button button--primary"
                    href={`/expenses/new?${data.ledgerId ? `ledgerId=${data.ledgerId}&` : ''}planId=${planId}`}
                  >
                    <Plus /> İlk harcamayı ekle
                  </Link>
                ) : null}
              </div>
            )}
          </section>
        </>
      ) : null}
      {activeView === 'activity' ? (
        <ActivityFeed ledgerId={data.ledgerId} planId={planId} />
      ) : null}
      {activeView === 'balances' ? (
        <>
          <PageIntro
            pageKey="balances"
            title="Plan hesabı yalnız bu Planın kayıtlarını kapsar."
            steps={[
              'Ödeme önerileri Plan harcamaları ve ödeme kayıtlarından hesaplanır; Defterin diğer hareketleri bu sonuca karışmaz.',
            ]}
          />
          <BalanceExperience
            scope="plan"
            ledgerId={data.ledgerId}
            planId={planId}
            balance={balance.data}
            isLoading={balance.isLoading}
            isError={balance.isError}
            onRetry={() => void balance.refetch()}
            currentUserId={user?.id ?? ''}
            role={
              data.scope === 'STANDALONE' && data.createdById === user?.id
                ? 'OWNER'
                : (ledger.data?.role ?? 'MEMBER')
            }
            mutationsDisabled={Boolean(
              ledger.data?.archivedAt || data.status === 'ARCHIVED',
            )}
            planStatus={data.status}
          />
        </>
      ) : null}
      {activeView === 'analytics' ? (
        <AnalyticsExperience
          scope="plan"
          resourceId={planId}
          planStatus={data.status}
          participantCount={data.participantCount}
        />
      ) : null}
      {activeView === 'participants' ? (
        <PlanParticipantsPanel
          plan={data}
          participants={participants.data ?? []}
          members={members.data ?? []}
          canManage={Boolean(canEdit)}
        />
      ) : null}
      {activeView === 'settings' ? (
        <PlanSettingsPanel
          plan={data}
          ledgers={ledgers.data ?? []}
          canEdit={Boolean(canEdit)}
          canAdmin={Boolean(canAdmin)}
        />
      ) : null}
    </>
  );
}
