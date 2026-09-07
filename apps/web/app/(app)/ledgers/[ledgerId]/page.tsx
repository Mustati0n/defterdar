'use client';

import {
  ArrowLeft,
  BarChart3,
  BookOpenText,
  CalendarRange,
  Clock3,
  NotebookTabs,
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
import { FinancialPosition } from '@/features/financial/financial-position';
import { PaymentApprovalSummary } from '@/features/financial/payment-approval-summary';
import {
  financialPositionState,
  prioritizeSuggestions,
} from '@/features/financial/financial-ux';
import {
  formatMoneyFromMinor,
  ledgerRoleLabel,
  planStatusLabel,
} from '@/lib/format';
import { AnalyticsExperience } from '@/features/analytics/analytics-experience';
import { CategoryManager } from '@/features/settings/category-manager';
import { PageIntro } from '@/features/page-intro/page-intro';
import { DetailViewHeader } from '@/components/detail-view-header';
import { DetailViewTransition } from '@/components/detail-view-transition';
import { CardDetailSurface } from '@/components/card-detail-transition';

const primaryViews = [
  { id: 'general', label: 'Genel', icon: BookOpenText },
  { id: 'balances', label: 'Hesap', icon: WalletCards },
  { id: 'activity', label: 'Hareketler', icon: Clock3 },
  { id: 'plans', label: 'Planlar', icon: NotebookTabs },
  { id: 'analytics', label: 'İstatistikler', icon: BarChart3 },
] as const;
const managementViews = [
  { id: 'members', label: 'Üyeler', icon: UsersRound },
  { id: 'settings', label: 'Ayarlar', icon: Settings },
] as const;
const ledgerViewOrder = [
  'general',
  'balances',
  'activity',
  'plans',
  'analytics',
  'members',
  'settings',
] as const;
type LedgerView =
  | 'general'
  | 'activity'
  | 'plans'
  | 'balances'
  | 'analytics'
  | 'members'
  | 'settings';

export default function LedgerDetailPage() {
  const { ledgerId } = useParams<{ ledgerId: string }>();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const requestedView = resolveDetailView(
    searchParams.get('view'),
    [
      'general',
      'activity',
      'plans',
      'balances',
      'analytics',
      'members',
      'settings',
    ],
    'general',
  ) as LedgerDetailView;
  const { ledger, plans, members, balance, expenses, incomes, settlements } =
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
  const collaborative = Boolean(data.isCollaborative);
  const secondaryViews = managementViews;
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
  const myNet = myPosition?.netMinor ?? 0;
  const hasFinancialActivity = Boolean(
    expenses.data?.some(
      (expense) =>
        !expense.voidedAt &&
        expense.splits.some((split) => split.isReimbursable),
    ),
  );
  const myFinancialState = financialPositionState(myNet, hasFinancialActivity);
  const suggestionGroups = prioritizeSuggestions(
    balance.data?.suggestions ?? [],
    user?.id ?? '',
  );
  const participantNames = new Map(
    balance.data?.positions.map((position) => [
      position.user.id,
      position.user.displayName,
    ]),
  );
  const financialItems = (
    myFinancialState === 'DEBTOR'
      ? suggestionGroups.payments.map((suggestion) => ({
          id: `${suggestion.fromUserId}-${suggestion.toUserId}`,
          label: `${participantNames.get(suggestion.toUserId) ?? 'Bir katılımcı'} kişisine`,
          amountMinor: suggestion.amountMinor,
        }))
      : myFinancialState === 'CREDITOR'
        ? suggestionGroups.receivables.map((suggestion) => ({
            id: `${suggestion.fromUserId}-${suggestion.toUserId}`,
            label: `${participantNames.get(suggestion.fromUserId) ?? 'Bir katılımcı'} kişisinden`,
            amountMinor: suggestion.amountMinor,
          }))
        : []
  ).slice(0, 3);
  const linkedPlans = (plans.data ?? []).filter(
    (plan) => plan.scope === 'LEDGER' && plan.ledgerId === ledgerId,
  );

  return (
    <>
      <Link className="back-link" href="/workspace?type=ledger">
        <ArrowLeft /> Defterler &amp; Planlara dön
      </Link>
      <CardDetailSurface transitionKey={`ledger:${ledgerId}`}>
        <section
          className={`ledger-detail-identity${collaborative ? ' ledger-detail-identity--collaborative' : ''}`}
          aria-labelledby="ledger-detail-title"
        >
          <div className="ledger-detail-identity__copy">
            <span className="eyebrow">
              {collaborative ? 'Ortak defter' : 'Defter'} · {data.currency}
            </span>
            <h1 className="type-detail-title" id="ledger-detail-title">
              {data.name}
            </h1>
            {data.description ? <p>{data.description}</p> : null}
          </div>
          <div
            className="ledger-detail-identity__meta"
            aria-label="Defter özeti"
          >
            <span>{ledgerRoleLabel(data.role)}</span>
            {data.archivedAt ? <span>Arşivde</span> : null}
            {collaborative ? (
              <span>
                <UsersRound />
                {data.activeMemberCount ?? members.data?.length ?? '—'} kişi
              </span>
            ) : (
              <span>Tek kişilik alan</span>
            )}
          </div>
        </section>
      </CardDetailSurface>

      {activeView === 'general' ? (
        <div className="ledger-financial-priority">
          {collaborative && (balance.isLoading || expenses.isLoading) ? (
            <LoadingState label="Finansal durumun hazırlanıyor…" />
          ) : collaborative && (balance.isError || expenses.isError) ? (
            <ErrorState
              message="Finansal durumun şu anda gösterilemiyor. Kayıtların güvende."
              onRetry={() => {
                void balance.refetch();
                void expenses.refetch();
              }}
            />
          ) : (
            <FinancialPosition
              state={collaborative ? myFinancialState : 'NO_ACTIVITY'}
              currency={data.currency}
              amountMinor={myNet}
              items={financialItems}
              label={collaborative ? 'Senin hesabın' : 'Senin alanın'}
              description={
                collaborative
                  ? undefined
                  : 'Bu kişisel Defterde ortak ödeme ve tahsilat hesabı oluşmaz.'
              }
              action={
                !data.archivedAt && myFinancialState === 'NO_ACTIVITY'
                  ? {
                      href: `/expenses/new?ledgerId=${ledgerId}`,
                      label: collaborative
                        ? 'İlk harcamayı ekle'
                        : 'Harcama ekle',
                    }
                  : {
                      href: `/ledgers/${ledgerId}?view=balances`,
                      label:
                        myFinancialState === 'DEBTOR'
                          ? 'Hesabı incele / ödeme ekle'
                          : 'Hesabı incele',
                    }
              }
            />
          )}

          {collaborative ? (
            <PaymentApprovalSummary
              settlements={settlements.data}
              currentUserId={user?.id ?? ''}
              currency={data.currency}
              accountHref={`/ledgers/${ledgerId}?view=balances#payment-approvals`}
              isLoading={settlements.isLoading}
              isError={settlements.isError}
              onRetry={() => void settlements.refetch()}
            />
          ) : null}
        </div>
      ) : null}

      <DetailNavigation
        label="Defter bölümleri"
        basePath={`/ledgers/${ledgerId}`}
        activeView={activeView}
        primary={primaryViews}
        secondary={secondaryViews}
        secondaryLabel="Yönetim"
      />

      <DetailViewTransition view={activeView} order={ledgerViewOrder}>
        {activeView === 'general' ? (
          <>
            <section className="paper-section expense-section">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Defter hareketleri</span>
                  <h2>Son harcamalar</h2>
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
                          {!collaborative
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
                        ? !collaborative
                          ? 'İlk harcamanı ekleyebilirsin.'
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
                </div>
                <div className="simple-list">
                  {linkedPlans.slice(0, 5).map((plan) => (
                    <Link href={`/plans/${plan.id}`} key={plan.id}>
                      <strong>{plan.name}</strong>
                      <small>
                        {planStatusLabel(plan.status)} · {plan.participantCount}{' '}
                        katılımcı
                      </small>
                    </Link>
                  ))}
                  {!linkedPlans.length ? (
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
                        {new Date(income.incomeDate).toLocaleDateString(
                          'tr-TR',
                        )}
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
        {activeView === 'activity' ? (
          <div className="ledger-subpage">
            <DetailViewHeader
              eyebrow="Kayıt geçmişi"
              title="Hareketler"
              description="Bu Defterde gerçekleşen işlemleri en yeniden eskiye doğru incele."
              icon={Clock3}
            />
            <ActivityFeed ledgerId={ledgerId} showHeading={false} />
          </div>
        ) : null}
        {activeView === 'plans' ? (
          <div className="ledger-subpage">
            <DetailViewHeader
              eyebrow="Deftere bağlı"
              title="Planlar"
              description={`${data.name} kapsamında yürüttüğün Planları tek yerde takip et.`}
              icon={NotebookTabs}
              meta={
                <span className="ledger-plans-workspace__count">
                  {linkedPlans.length} Plan
                </span>
              }
            />
            <section
              className="ledger-plans-workspace"
              aria-label={`${data.name} Planları`}
            >
              {plans.isLoading ? (
                <LoadingState label="Defter Planları hazırlanıyor…" />
              ) : null}
              {plans.isError ? (
                <ErrorState
                  message="Bu Deftere bağlı Planlar yüklenemedi."
                  onRetry={() => void plans.refetch()}
                />
              ) : null}
              {!plans.isLoading && !plans.isError && linkedPlans.length ? (
                <div className="ledger-plans-grid">
                  {linkedPlans.map((plan) => (
                    <Link
                      className="ledger-plan-row"
                      href={`/plans/${plan.id}`}
                      key={plan.id}
                    >
                      <span>
                        <strong>{plan.name}</strong>
                        <small>
                          {planStatusLabel(plan.status)} ·{' '}
                          {plan.participantCount} katılımcı
                        </small>
                      </span>
                      <span className="ledger-plan-row__context">
                        <CalendarRange />
                        {plan.startsAt
                          ? new Date(plan.startsAt).toLocaleDateString('tr-TR')
                          : 'Başlangıç serbest'}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : null}
              {!plans.isLoading && !plans.isError && !linkedPlans.length ? (
                <div className="smart-empty">
                  <span>
                    <NotebookTabs />
                  </span>
                  <div>
                    <h3>Bu Deftere bağlı Plan yok.</h3>
                    <p>
                      Sağ alttaki oluştur menüsünden bu Defter için yeni bir
                      Plan ekleyebilirsin.
                    </p>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        ) : null}
        {activeView === 'balances' && collaborative ? (
          <div className="ledger-subpage">
            <DetailViewHeader
              eyebrow="Ortak hesap"
              title="Hesap"
              description="Borç ve alacak durumunu, ödeme önerilerini ve onay bekleyen kayıtları incele."
              icon={WalletCards}
            />
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
          </div>
        ) : null}
        {activeView === 'balances' && !collaborative ? (
          <div className="ledger-subpage">
            <DetailViewHeader
              eyebrow="Kişisel Defter"
              title="Hesap"
              description="Kişisel Defterlerde katılımcılar arası borç veya alacak hesabı oluşmaz."
              icon={WalletCards}
            />
            <section className="paper-section personal-account-note">
              <span aria-hidden="true">
                <BookOpenText />
              </span>
              <div>
                <span className="eyebrow">Bilmen gereken</span>
                <h2>Ortak hesap oluşmaz</h2>
                <p>
                  Bu alan yalnızca sana ait olduğu için kimseye borç veya alacak
                  hesaplanmaz. Harcamalarını Genel bölümünden takip edebilirsin.
                </p>
              </div>
            </section>
          </div>
        ) : null}
        {activeView === 'analytics' ? (
          <div className="ledger-subpage">
            <DetailViewHeader
              eyebrow="Dönem görünümü"
              title="İstatistikler"
              description="Harcama, gelir ve kategori dağılımlarını seçtiğin döneme göre karşılaştır."
              icon={BarChart3}
            />
            <AnalyticsExperience
              scope="ledger"
              resourceId={ledgerId}
              personal={!collaborative}
            />
          </div>
        ) : null}
        {activeView === 'members' ? (
          <LedgerMembersPanel ledger={data} members={members.data ?? []} />
        ) : null}
        {activeView === 'settings' ? (
          <>
            <LedgerSettingsPanel ledger={data} members={members.data ?? []} />
            <CategoryManager ledgerContext={data} />
          </>
        ) : null}
      </DetailViewTransition>
    </>
  );
}
