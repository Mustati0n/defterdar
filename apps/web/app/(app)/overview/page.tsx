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
  const activeLedgers = overview.data?.ledgers.filter(
    (ledger) => !ledger.archivedAt,
  );
  const activePlans = (overview.data?.plans ?? []).filter(
    (plan) => plan.status === 'ACTIVE',
  );

  if (overview.isLoading) return <LoadingState label="Özet hazırlanıyor…" />;
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
        new Date(left.startsAt!).getTime() - new Date(right.startsAt!).getTime(),
    );
  const orderedPlans = [...activePlans].sort((left, right) => {
    const leftUpcoming = upcomingPlans.findIndex((plan) => plan.id === left.id);
    const rightUpcoming = upcomingPlans.findIndex((plan) => plan.id === right.id);
    if (leftUpcoming < 0 && rightUpcoming < 0) return 0;
    if (leftUpcoming < 0) return 1;
    if (rightUpcoming < 0) return -1;
    return leftUpcoming - rightUpcoming;
  });
  const incomingPayments = pendingPayments.filter(
    (payment) => payment.toUserId === user?.id,
  );
  const priorityItems = [
    ...pendingPayments.slice(0, 2).map((payment) => ({
      id: `payment-${payment.id}`,
      href: payment.ledgerId
        ? `/ledgers/${payment.ledgerId}?view=balances`
        : `/plans/${payment.planId}?view=balances`,
      tone: payment.toUserId === user?.id ? 'critical' : 'attention',
      icon: payment.toUserId === user?.id ? AlertCircle : Clock3,
      label:
        payment.toUserId === user?.id ? 'Onayın gerekiyor' : 'Onay bekleniyor',
      title:
        payment.toUserId === user?.id
          ? `${payment.fromUser.displayName} ödeme yaptığını bildirdi`
          : `${payment.toUser.displayName} ödemeyi onaylayacak`,
      detail: formatMoneyFromMinor(payment.amountMinor, payment.currency),
    })),
    ...owedBalances.slice(0, 2).map(({ ledger, balance, position }) => ({
      id: `ledger-balance-${ledger.id}`,
      href: `/ledgers/${ledger.id}?view=balances`,
      tone: 'attention',
      icon: WalletCards,
      label: 'Açık hesap',
      title: `${ledger.name} Defterinde ödemen var`,
      detail: `${formatMoneyFromMinor(Math.abs(position.netMinor), balance.currency)} · Bakiyeyi incele`,
    })),
    ...openPlanAccounts.slice(0, 2).map(({ plan, balance, position }) => ({
      id: `plan-balance-${plan.id}`,
      href: `/plans/${plan.id}?view=balances`,
      tone: 'info',
      icon: NotebookTabs,
      label: 'Plan hesabı açık',
      title: `${plan.name} Planında ${position.netMinor < 0 ? 'ödemen' : 'alacağın'} var`,
      detail: `${formatMoneyFromMinor(Math.abs(position.netMinor), balance.currency)} · Hesabı kontrol et`,
    })),
    ...upcomingPlans.slice(0, 2).map((plan) => ({
      id: `upcoming-plan-${plan.id}`,
      href: `/plans/${plan.id}`,
      tone: 'positive',
      icon: CalendarDays,
      label: 'Yaklaşan Plan',
      title: plan.name,
      detail: `${formatDate(plan.startsAt)} tarihinde başlıyor`,
    })),
  ].slice(0, 6);
  const activityTarget = activeLedgers?.[0]
    ? `/ledgers/${activeLedgers[0].id}?view=activity`
    : activePlans[0]
      ? `/plans/${activePlans[0].id}?view=activity`
      : null;
  return (
    <>
      <PageHeading
        eyebrow="Özet"
        title="Bugün"
        description={`${user?.displayName ? `Merhaba ${user.displayName}. ` : ''}Öncelikli hesaplarını ve yaklaşan Planlarını tek bakışta gör.`}
        variant="compact"
      />

      <section className="overview-focus" aria-labelledby="overview-focus-title">
        <div className="overview-focus__heading">
          <div>
            <span className="eyebrow">Günün özeti</span>
            <h2 id="overview-focus-title">Bugün neye dikkat etmelisin?</h2>
            <p>
              {incomingPayments.length
                ? `${incomingPayments.length} ödeme onayı senden aksiyon bekliyor.`
                : priorityItems.length
                  ? 'Açık hesapların ve yaklaşan Planların önem sırasına göre burada.'
                  : 'Acil bir konu yok; Defterlerin ve Planların güncel görünüyor.'}
            </p>
          </div>
          {priorityItems.length ? (
            <span className="overview-focus__count">{priorityItems.length} konu</span>
          ) : (
            <span className="overview-focus__count overview-focus__count--clear">
              Güncel
            </span>
          )}
        </div>

        {priorityItems.length ? (
          <div className="overview-focus__grid">
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
                  <ArrowRight className="overview-priority__arrow" />
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="overview-focus__clear">
            <CheckCircle2 />
            <div>
              <strong>Bugün için açık bir konu görünmüyor.</strong>
              <p>Yeni bir hareket olduğunda önceliklerin burada belirecek.</p>
            </div>
            <Link href="/workspace">
              Çalışma alanına git <ArrowRight />
            </Link>
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
