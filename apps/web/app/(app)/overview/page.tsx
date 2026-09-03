'use client';

import {
  ArrowRight,
  AlertCircle,
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  Clock3,
  NotebookTabs,
  WalletCards,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { LedgerCard } from '@/components/ledger-card';
import { PageHeading } from '@/components/page-heading';
import { PlanCard } from '@/components/plan-card';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useOverview } from '@/features/data/hooks';
import { useAuth } from '@/features/auth/auth-provider';
import { formatDate, formatMoneyFromMinor } from '@/lib/format';
import { activitySentence } from '@/lib/activity';
import { useInterfacePreferences } from '@/features/preferences/use-interface-preferences';

export default function OverviewPage() {
  const { user } = useAuth();
  const overview = useOverview();
  const { preferences } = useInterfacePreferences(user?.id);
  const [referenceTime] = useState(Date.now);
  const [showAllPriorities, setShowAllPriorities] = useState(false);
  const activeLedgers = overview.data?.ledgers.filter(
    (ledger) => !ledger.archivedAt,
  );
  const activePlans = (overview.data?.plans ?? []).filter(
    (plan) => plan.status === 'ACTIVE',
  );

  if (overview.isLoading)
    return <LoadingState label="Genel Bakış hazırlanıyor…" />;
  if (overview.isError)
    return <ErrorState onRetry={() => void overview.refetch()} />;

  const owedBalances = (overview.data?.ledgerBalances ?? []).flatMap(
    ({ ledgerId, balance }) => {
      const ledger = activeLedgers?.find((item) => item.id === ledgerId);
      if (!ledger) return [];
      const position = balance.positions.find(
        (item) => item.user.id === user?.id,
      );
      return position && position.netMinor < 0
        ? [{ ledger, balance, position }]
        : [];
    },
  );
  const openPlanAccounts = (overview.data?.planBalances ?? []).flatMap(
    ({ planId, balance }) => {
      const plan = activePlans.find((item) => item.id === planId);
      if (!plan) return [];
      const position = balance.positions.find(
        (item) => item.user.id === user?.id,
      );
      return position && position.netMinor !== 0
        ? [{ plan, balance, position }]
        : [];
    },
  );
  const pendingPayments = overview.data?.pendingPayments ?? [];
  const upcomingPlans = activePlans
    .filter(
      (plan) =>
        plan.startsAt && new Date(plan.startsAt).getTime() > referenceTime,
    )
    .sort(
      (left, right) =>
        new Date(left.startsAt!).getTime() -
        new Date(right.startsAt!).getTime(),
    );
  const orderedPlans = [...activePlans].sort((left, right) => {
    const leftUpcoming = upcomingPlans.findIndex((plan) => plan.id === left.id);
    const rightUpcoming = upcomingPlans.findIndex(
      (plan) => plan.id === right.id,
    );
    if (leftUpcoming < 0 && rightUpcoming < 0) return 0;
    if (leftUpcoming < 0) return 1;
    if (rightUpcoming < 0) return -1;
    return leftUpcoming - rightUpcoming;
  });
  const priorityItems = [
    ...pendingPayments.map((payment) => ({
      id: `payment-${payment.id}`,
      href: payment.ledgerId
        ? `/ledgers/${payment.ledgerId}?view=balances`
        : `/plans/${payment.planId}?view=balances`,
      tone: payment.toUserId === user?.id ? 'critical' : 'attention',
      priority: payment.toUserId === user?.id ? 1 : 2,
      icon: payment.toUserId === user?.id ? AlertCircle : Clock3,
      label:
        payment.toUserId === user?.id ? 'Onayın gerekiyor' : 'Onay bekleniyor',
      title:
        payment.toUserId === user?.id
          ? `${payment.fromUser.displayName} ödeme yaptığını bildirdi`
          : `${payment.toUser.displayName} ödemeyi onaylayacak`,
      detail: formatMoneyFromMinor(payment.amountMinor, payment.currency),
      action: payment.toUserId === user?.id ? 'Kontrol et' : 'Hesabı aç',
    })),
    ...owedBalances.map(({ ledger, balance, position }) => ({
      id: `ledger-balance-${ledger.id}`,
      href: `/ledgers/${ledger.id}?view=balances`,
      tone: 'attention',
      priority: 2,
      icon: WalletCards,
      label: 'Açık hesap',
      title: `${ledger.name} Defterinde ödemen var`,
      detail: `${formatMoneyFromMinor(Math.abs(position.netMinor), balance.currency)} · Bakiyeyi incele`,
      action: 'Bakiyeyi aç',
    })),
    ...openPlanAccounts.map(({ plan, balance, position }) => ({
      id: `plan-balance-${plan.id}`,
      href: `/plans/${plan.id}?view=balances`,
      tone: 'info',
      priority: position.netMinor < 0 ? 2 : 4,
      icon: NotebookTabs,
      label: 'Plan hesabı açık',
      title: `${plan.name} Planında ${position.netMinor < 0 ? 'ödemen' : 'alacağın'} var`,
      detail: `${formatMoneyFromMinor(Math.abs(position.netMinor), balance.currency)} · Hesabı kontrol et`,
      action: 'Hesabı aç',
    })),
    ...upcomingPlans.map((plan) => ({
      id: `upcoming-plan-${plan.id}`,
      href: `/plans/${plan.id}`,
      tone: 'positive',
      priority: 3,
      icon: CalendarDays,
      label: 'Yaklaşan Plan',
      title: plan.name,
      detail: `${formatDate(plan.startsAt)} tarihinde başlıyor`,
      action: 'Planı aç',
    })),
  ]
    .sort((left, right) => left.priority - right.priority)
    .slice(0, 3);
  const activityTarget = activeLedgers?.[0]
    ? `/ledgers/${activeLedgers[0].id}?view=activity`
    : activePlans[0]
      ? `/plans/${activePlans[0].id}?view=activity`
      : null;
  return (
    <>
      <PageHeading
        title="Genel Bakış"
        description="Defterlerindeki ve Planlarındaki önemli gelişmeleri tek bakışta gör."
        variant="compact"
      />

      <section
        className="overview-focus"
        aria-labelledby="overview-focus-title"
      >
        <div className="overview-focus__heading">
          <div>
            <span className="eyebrow">Dikkatini isteyenler</span>
            <h2 id="overview-focus-title">Bugünün durumu</h2>
            <p>
              {priorityItems.length
                ? `${priorityItems.length} konu dikkatini bekliyor.`
                : 'Defterlerin ve Planların güncel görünüyor.'}
            </p>
          </div>
          {priorityItems.length ? (
            <span className="overview-focus__count">
              {priorityItems.length} konu
            </span>
          ) : (
            <span className="overview-focus__count overview-focus__count--clear">
              Güncel
            </span>
          )}
        </div>

        {priorityItems.length ? (
          <div
            className={`overview-focus__grid${showAllPriorities ? ' is-expanded' : ''}`}
            id="overview-priority-list"
          >
            {priorityItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  className={`overview-priority overview-priority--${item.tone}`}
                  href={item.href}
                  key={item.id}
                >
                  <span className="overview-priority__icon">
                    <Icon />
                  </span>
                  <span className="overview-priority__copy">
                    <small>{item.label}</small>
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </span>
                  <span className="overview-priority__action">
                    {item.action} <ArrowRight />
                  </span>
                </Link>
              );
            })}
            {priorityItems.length > 2 ? (
              <button
                className="overview-focus__more"
                type="button"
                aria-controls="overview-priority-list"
                aria-expanded={showAllPriorities}
                onClick={() => setShowAllPriorities((current) => !current)}
              >
                {showAllPriorities ? 'Daha az göster' : 'Tümünü gör'}
              </button>
            ) : null}
          </div>
        ) : (
          <div className="overview-focus__clear">
            <CheckCircle2 />
            <div>
              <strong>Her şey yolunda.</strong>
              <p>Şu an dikkatini isteyen bir kayıt yok.</p>
            </div>
          </div>
        )}
      </section>

      {preferences.overview.ledgers && activeLedgers?.length ? (
        <section className="overview-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">İlgili çalışma alanları</span>
              <h2>Defterlerin</h2>
            </div>
            <Link href="/workspace?type=ledger">
              Tümünü gör <ArrowRight />
            </Link>
          </div>
          <div className="overview-card-grid overview-card-grid--ledgers">
            {activeLedgers.slice(0, 3).map((ledger) => (
              <LedgerCard ledger={ledger} key={ledger.id} />
            ))}
          </div>
        </section>
      ) : preferences.overview.ledgers ? (
        <section className="overview-empty" aria-label="Defter başlangıcı">
          <BookOpenText />
          <div>
            <strong>Henüz Defterin yok.</strong>
            <p>
              İlk Defterini açabilir veya bir Deftere eklemeden Plan
              yapabilirsin.
            </p>
          </div>
          <Link
            className="button button--quiet button--small"
            href="/workspace?type=ledger&create=ledger"
          >
            Defter oluştur
          </Link>
          <Link
            className="button button--quiet button--small"
            href="/workspace?type=plan&create=plan&standalone=1"
          >
            Deftere ekli olmayan Plan
          </Link>
        </section>
      ) : null}

      {preferences.overview.plans && activePlans.length ? (
        <section className="overview-section overview-plans">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Yaklaşan ve aktif</span>
              <h2>Planların</h2>
            </div>
            <Link href="/workspace?type=plan">
              Tüm planlar <ArrowRight />
            </Link>
          </div>
          <div className="overview-card-grid overview-card-grid--plans">
            {orderedPlans.slice(0, 3).map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                ledger={activeLedgers?.find(
                  (ledger) => ledger.id === plan.ledgerId,
                )}
              />
            ))}
          </div>
        </section>
      ) : null}

      {preferences.overview.activity &&
      overview.data?.activity?.items.length ? (
        <section className="activity-paper overview-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Son kayıtlar</span>
              <h2>Son hareketler</h2>
            </div>
            {activityTarget ? (
              <Link href={activityTarget}>
                Tümünü gör <ArrowRight />
              </Link>
            ) : null}
          </div>
          <ol className="activity-list">
            {(overview.data.activity?.items ?? []).map((item) => (
              <li key={item.id}>
                <span />
                <div>
                  <strong>{item.actor?.displayName ?? 'Defterdar'}</strong>
                  <p>{activitySentence(item)}</p>
                  <small>
                    {new Date(item.createdAt).toLocaleString('tr-TR')}
                  </small>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </>
  );
}
