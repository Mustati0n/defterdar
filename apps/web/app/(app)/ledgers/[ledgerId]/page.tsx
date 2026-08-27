'use client';

import {
  ArrowLeft,
  BarChart3,
  BookOpenText,
  CircleDollarSign,
  Clock3,
  Plus,
  ReceiptText,
  Settings,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { ErrorState, LoadingState } from '@/components/ui/states';
import {
  DetailNavigation,
  resolveDetailView,
} from '@/components/detail-navigation';
import { useLedgerDetailData } from '@/features/data/hooks';
import type { LedgerDetailView } from '@/features/data/hooks';
import { useAuth } from '@/features/auth/auth-provider';
import { ActivityFeed } from '@/features/activity/activity-feed';
import {
  LedgerMembersPanel,
  LedgerSettingsPanel,
} from '@/features/ledgers/ledger-management';
import { ExpenseIndicators } from '@/features/expenses/expense-indicators';
import { BalanceExperience } from '@/features/financial/balance-experience';
import { positionState } from '@/features/financial/financial-ux';
import {
  formatMoneyFromMinor,
  ledgerRoleLabel,
  planStatusLabel,
} from '@/lib/format';
import { AnalyticsExperience } from '@/features/analytics/analytics-experience';
import { CategoryManager } from '@/features/settings/category-manager';
import { PageIntro } from '@/features/page-intro/page-intro';

const primarySharedViews = [
  { id: 'general', label: 'Genel', icon: BookOpenText },
  { id: 'balances', label: 'Bakiyeler', icon: WalletCards },
  { id: 'analytics', label: 'İstatistikler', icon: BarChart3 },
] as const;
const primaryPersonalViews = [
  { id: 'general', label: 'Genel', icon: BookOpenText },
  { id: 'analytics', label: 'İstatistikler', icon: BarChart3 },
] as const;
const secondarySharedViews = [
  { id: 'activity', label: 'Tüm hareketler', icon: Clock3 },
  { id: 'members', label: 'Üyeler', icon: UsersRound },
  { id: 'settings', label: 'Ayarlar', icon: Settings },
] as const;
const secondaryPersonalViews = [
  { id: 'activity', label: 'Tüm hareketler', icon: Clock3 },
  { id: 'settings', label: 'Ayarlar', icon: Settings },
] as const;
type LedgerView =
  'general' | 'activity' | 'balances' | 'analytics' | 'members' | 'settings';

export default function LedgerDetailPage() {
  const { ledgerId } = useParams<{ ledgerId: string }>();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const requestedView = resolveDetailView(
    searchParams.get('view'),
    ['general', 'activity', 'balances', 'analytics', 'members', 'settings'],
    'general',
  ) as LedgerDetailView;
  const { ledger, plans, members, balance, expenses, incomes } =
    useLedgerDetailData(ledgerId, requestedView);

  if (ledger.isLoading) return <LoadingState label="Defter açılıyor…" />;
  if (ledger.isError || !ledger.data)
    return (
      <ErrorState
        message="Bu deftere erişilemiyor ya da defter artık mevcut değil."
        onRetry={() => void ledger.refetch()}
      />
    );

  const data = ledger.data;
  const primaryViews =
    data.type === 'PERSONAL' ? primaryPersonalViews : primarySharedViews;
  const secondaryViews =
    data.type === 'PERSONAL' ? secondaryPersonalViews : secondarySharedViews;
  const allowedViews = [...primaryViews, ...secondaryViews].map(
    (view) => view.id,
  ) as LedgerView[];
  const activeView = resolveDetailView(
    searchParams.get('view'),
    allowedViews,
    'general',
  );
  const myPosition = balance.data?.positions.find(
    (position) => position.user.id === user?.id,
  );
  const myBalanceState = positionState(myPosition?.netMinor ?? 0);

  return (
    <>
      <Link className="back-link" href="/workspace?type=ledger">
        <ArrowLeft /> Defterler &amp; Planlara dön
      </Link>
      <section className="detail-cover detail-cover--ledger">
        <span className="detail-cover__bookmark">
          {ledgerRoleLabel(data.role)}
        </span>
        <div>
          <span className="eyebrow eyebrow--light">
            {data.type === 'PERSONAL' ? 'Kişisel defter' : 'Ortak defter'} ·{' '}
            {data.currency}
          </span>
          <h1>{data.name}</h1>
          {data.description ? <p>{data.description}</p> : null}
          <div className="detail-cover__meta" aria-label="Defter özeti">
            <span>
              <UsersRound />
              {data.type === 'SHARED'
                ? `${members.data?.length ?? '—'} kişi`
                : 'Kişisel alan'}
            </span>
            <span>
              <BookOpenText /> {plans.data?.length ?? '—'} aktif plan
            </span>
            {data.type === 'SHARED' ? (
              <Link href={`/ledgers/${ledgerId}?view=balances`}>
                <CircleDollarSign />
                {myBalanceState === 'receivable'
                  ? `${formatMoneyFromMinor(Math.abs(myPosition?.netMinor ?? 0), data.currency)} alacak`
                  : myBalanceState === 'payable'
                    ? `${formatMoneyFromMinor(Math.abs(myPosition?.netMinor ?? 0), data.currency)} ödeme`
                    : 'Hesap kapalı'}
              </Link>
            ) : (
              <span>
                <CircleDollarSign /> {expenses.data?.length ?? '—'} harcama
              </span>
            )}
          </div>
        </div>
      </section>
      <DetailNavigation
        label="Defter bölümleri"
        basePath={`/ledgers/${ledgerId}`}
        activeView={activeView}
        primary={primaryViews}
        secondary={secondaryViews}
      />

      {activeView === 'general' ? (
        <>
          <section className="paper-section expense-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Defter hareketleri</span>
                <h2>Son harcamalar</h2>
              </div>
              {expenses.data?.length && !data.archivedAt ? (
                <Link
                  className="button button--primary button--small"
                  href={`/expenses/new?ledgerId=${ledgerId}`}
                >
                  <Plus /> Harcama ekle
                </Link>
              ) : null}
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
                        {data.type === 'PERSONAL'
                          ? (expense.category?.name ?? 'Kategorisiz')
                          : `${expense.payer.displayName} ödedi · ${expense.splits.length} kişi paylaştı`}
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
                    {!data.archivedAt
                      ? data.type === 'PERSONAL'
                        ? 'İlk kişisel harcamanı ekleyebilirsin.'
                        : 'İlk harcamayı eklediğinde paylar ve bakiyeler hesaplanır.'
                      : 'Bu Defter arşivde olduğu için yeni harcama eklenemez; mevcut kayıtlar okunmaya devam eder.'}
                  </p>
                </div>
                {!data.archivedAt ? (
                  <Link
                    className="button button--primary"
                    href={`/expenses/new?ledgerId=${ledgerId}`}
                  >
                    <Plus /> İlk harcamayı ekle
                  </Link>
                ) : null}
              </div>
            )}
          </section>
          <div className="detail-grid">
            <section className="paper-section">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Planlar</span>
                  <h2>Planlar</h2>
                </div>
                {!data.archivedAt ? (
                  <Link
                    className="button button--quiet button--small"
                    href={`/workspace?create=plan&ledgerId=${ledgerId}`}
                  >
                    <Plus /> Plan ekle
                  </Link>
                ) : null}
              </div>
              <div className="simple-list">
                {(plans.data ?? []).slice(0, 5).map((plan) => (
                  <Link href={`/plans/${plan.id}`} key={plan.id}>
                    <strong>{plan.name}</strong>
                    <small>
                      {planStatusLabel(plan.status)} · {plan.participantCount}{' '}
                      katılımcı
                    </small>
                  </Link>
                ))}
                {!plans.data?.length ? (
                  <p className="muted-copy">Bu Deftere bağlı Plan yok.</p>
                ) : null}
              </div>
            </section>
            <section className="paper-section">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Gelen para</span>
                  <h2>Son gelirler</h2>
                </div>
                {!data.archivedAt ? (
                  <Link
                    className="button button--quiet button--small"
                    href={`/incomes/new?ledgerId=${ledgerId}`}
                  >
                    <Plus /> Gelir ekle
                  </Link>
                ) : null}
              </div>
              <div className="simple-list">
                {(incomes.data ?? []).slice(0, 5).map((income) => (
                  <div key={income.id}>
                    <strong>{income.title}</strong>
                    <small>
                      {formatMoneyFromMinor(
                        income.amountMinor,
                        income.currency,
                      )}{' '}
                      ·{' '}
                      {new Date(income.incomeDate).toLocaleDateString('tr-TR')}
                    </small>
                  </div>
                ))}
                {!incomes.data?.length ? (
                  <p className="muted-copy">Henüz gelir kaydı yok.</p>
                ) : null}
              </div>
            </section>
          </div>
        </>
      ) : null}
      {activeView === 'activity' ? <ActivityFeed ledgerId={ledgerId} /> : null}
      {activeView === 'balances' && data.type === 'SHARED' ? (
        <>
          <PageIntro
            pageKey="balances"
            title="Bakiye, ortak hesabın bugünkü sonucudur."
            steps={[
              'Artı tutar alacağını, eksi tutar yapman gereken ödemeyi gösterir; önerilen ödeme kayıtları hesabı sadeleştirir.',
            ]}
          />
          <BalanceExperience
            scope="ledger"
            ledgerId={ledgerId}
            balance={balance.data}
            isLoading={balance.isLoading}
            isError={balance.isError}
            onRetry={() => void balance.refetch()}
            currentUserId={user?.id ?? ''}
            role={data.role}
            mutationsDisabled={Boolean(data.archivedAt)}
          />
        </>
      ) : null}
      {activeView === 'analytics' ? (
        <AnalyticsExperience
          scope="ledger"
          resourceId={ledgerId}
          personal={data.type === 'PERSONAL'}
        />
      ) : null}
      {activeView === 'members' && data.type === 'SHARED' ? (
        <LedgerMembersPanel ledger={data} members={members.data ?? []} />
      ) : null}
      {activeView === 'settings' ? (
        <>
          <LedgerSettingsPanel ledger={data} members={members.data ?? []} />
          <CategoryManager ledgerContext={data} />
        </>
      ) : null}
    </>
  );
}
