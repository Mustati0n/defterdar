'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  AlertCircle,
  BookOpenText,
  CircleDollarSign,
  NotebookTabs,
  Plus,
  ReceiptText,
  WalletCards,
} from 'lucide-react';
import Link from 'next/link';
import { LedgerCard } from '@/components/ledger-card';
import { PageHeading } from '@/components/page-heading';
import { PlanCard } from '@/components/plan-card';
import { ErrorState, LoadingState } from '@/components/ui/states';
import {
  useAllPlans,
  useLedgerBalances,
  useLedgers,
  queryKeys,
  usePlanBalances,
} from '@/features/data/hooks';
import { useAuth } from '@/features/auth/auth-provider';
import { api } from '@/lib/api-client';
import { formatMoneyFromMinor } from '@/lib/format';
import { activitySentence } from '@/lib/activity';

export default function OverviewPage() {
  const { user } = useAuth();
  const ledgersQuery = useLedgers();
  const activeLedgers = ledgersQuery.data?.filter(
    (ledger) => !ledger.archivedAt,
  );
  const allPlans = useAllPlans(activeLedgers);
  const ledgerBalances = useLedgerBalances(activeLedgers);
  const activePlans = allPlans.plans.filter((plan) => plan.status === 'ACTIVE');
  const planBalances = usePlanBalances(activePlans);
  const firstLedgerId = activeLedgers?.[0]?.id ?? '';
  const activity = useQuery({
    queryKey: queryKeys.activityPreview(firstLedgerId),
    queryFn: () => api.ledgers.activity(firstLedgerId, 5),
    enabled: Boolean(firstLedgerId),
  });

  if (ledgersQuery.isLoading)
    return <LoadingState label="Özet hazırlanıyor…" />;
  if (ledgersQuery.isError)
    return <ErrorState onRetry={() => void ledgersQuery.refetch()} />;

  const personalLedger = activeLedgers?.find(
    (ledger) => ledger.type === 'PERSONAL',
  );
  const owedBalances = ledgerBalances.entries.flatMap(({ ledger, balance }) => {
    const position = balance.positions.find(
      (item) => item.user.id === user?.id,
    );
    return position && position.netMinor < 0
      ? [{ ledger, balance, position }]
      : [];
  });
  const openPlanAccounts = planBalances.entries.flatMap(({ plan, balance }) => {
    const position = balance.positions.find(
      (item) => item.user.id === user?.id,
    );
    return position && position.netMinor !== 0
      ? [{ plan, balance, position }]
      : [];
  });
  return (
    <>
      <PageHeading
        eyebrow="Özet"
        title={`Merhaba${user?.displayName ? `, ${user.displayName}` : ''}.`}
        description="İlgilenmen gereken hesaplara ve son kayıtlarına buradan ulaşabilirsin."
      />

      {owedBalances.length || openPlanAccounts.length ? (
        <section className="attention-strip" aria-label="İlgilenmen gerekenler">
          <div>
            <AlertCircle />
            <span>
              <small>Bugün neye bakmalısın?</small>
              <strong>Açık kalan hesapların var.</strong>
            </span>
          </div>
          <div className="attention-strip__items">
            {owedBalances.slice(0, 2).map(({ ledger, balance, position }) => (
              <Link href={`/ledgers/${ledger.id}?view=balances`} key={ledger.id}>
                <WalletCards />
                <span>
                  <strong>
                    {ledger.name}:{' '}
                    {formatMoneyFromMinor(
                      Math.abs(position.netMinor),
                      balance.currency,
                    )}{' '}
                    ödemen var
                  </strong>
                  <small>Bakiyeyi gör ve ödendi olarak kaydet</small>
                </span>
                <ArrowRight />
              </Link>
            ))}
            {openPlanAccounts.slice(0, 2).map(({ plan, balance, position }) => (
              <Link href={`/plans/${plan.id}?view=balances`} key={plan.id}>
                <NotebookTabs />
                <span>
                  <strong>
                    {plan.name} Planında{' '}
                    {formatMoneyFromMinor(
                      Math.abs(position.netMinor),
                      balance.currency,
                    )}{' '}
                    {position.netMinor < 0 ? 'ödemen' : 'alacağın'} var
                  </strong>
                  <small>Planın açık hesabını kontrol et</small>
                </span>
                <ArrowRight />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="overview-quick" aria-label="Hızlı işlemler">
        <div>
          <span className="eyebrow">Tek tık uzağında</span>
          <h2>Şimdi ne yapmak istersin?</h2>
        </div>
        <div className="overview-quick__actions">
          <Link
            href={`/expenses/new${personalLedger ? `?ledgerId=${personalLedger.id}` : ''}`}
          >
            <span>
              <ReceiptText />
            </span>
            <strong>Harcama ekle</strong>
            <small>Giderini kaydet</small>
            <Plus />
          </Link>
          <Link
            href={`/plans?create=1${personalLedger ? `&ledgerId=${personalLedger.id}` : ''}`}
          >
            <span>
              <NotebookTabs />
            </span>
            <strong>Plan oluştur</strong>
            <small>Etkinlik ekle</small>
            <Plus />
          </Link>
          <Link href="/ledgers?create=1">
            <span>
              <BookOpenText />
            </span>
            <strong>Defter oluştur</strong>
            <small>Yeni kayıt alanı aç</small>
            <Plus />
          </Link>
          <Link
            href={`/incomes/new${personalLedger ? `?ledgerId=${personalLedger.id}` : ''}`}
          >
            <span>
              <CircleDollarSign />
            </span>
            <strong>Gelir ekle</strong>
            <small>Nakit akışını yaz</small>
            <Plus />
          </Link>
        </div>
      </section>

      {activeLedgers?.length ? (
        <section>
          <div className="section-heading">
            <div>
              <span className="eyebrow">Aktif alanlar</span>
              <h2>Defterler</h2>
            </div>
            <Link href="/ledgers">
              Tümünü gör <ArrowRight />
            </Link>
          </div>
          <div className="mini-card-grid">
            {activeLedgers.slice(0, 2).map((ledger, index) => (
              <LedgerCard ledger={ledger} index={index} key={ledger.id} />
            ))}
          </div>
        </section>
      ) : null}

      {activePlans.length ? (
        <section className="overview-plans">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Aktif alanlar</span>
              <h2>Planlar</h2>
            </div>
            <Link href="/plans">
              Tüm planlar <ArrowRight />
            </Link>
          </div>
          <div className="plan-grid plan-grid--compact">
            {activePlans.slice(0, 3).map((plan, index) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                ledger={activeLedgers?.find(
                  (ledger) => ledger.id === plan.ledgerId,
                )}
                index={index}
              />
            ))}
          </div>
        </section>
      ) : null}

      {activity.data?.items.length ? (
        <section className="activity-paper">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Son kayıtlar</span>
              <h2>{activeLedgers?.[0]?.name} hareketleri</h2>
            </div>
            <Link href={`/ledgers/${firstLedgerId}?view=activity`}>
              Tümünü gör <ArrowRight />
            </Link>
          </div>
          <ol className="activity-list">
            {(activity.data?.items ?? []).map((item) => (
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
