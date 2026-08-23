'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  BookOpenText,
  CircleDollarSign,
  Clock3,
  NotebookTabs,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { LedgerCard } from '@/components/ledger-card';
import { PageHeading } from '@/components/page-heading';
import { PlanCard } from '@/components/plan-card';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useAllPlans, useLedgers, queryKeys } from '@/features/data/hooks';
import { api } from '@/lib/api-client';
import { formatMoneyFromMinor } from '@/lib/format';

export default function OverviewPage() {
  const ledgersQuery = useLedgers();
  const activeLedgers = ledgersQuery.data?.filter(
    (ledger) => !ledger.archivedAt,
  );
  const allPlans = useAllPlans(activeLedgers);
  const firstLedgerId = activeLedgers?.[0]?.id ?? '';
  const analytics = useQuery({
    queryKey: queryKeys.ledgerAnalytics(firstLedgerId),
    queryFn: () => api.ledgers.analytics(firstLedgerId),
    enabled: Boolean(firstLedgerId),
  });
  const activity = useQuery({
    queryKey: queryKeys.activity(firstLedgerId),
    queryFn: () => api.ledgers.activity(firstLedgerId, 5),
    enabled: Boolean(firstLedgerId),
  });

  if (ledgersQuery.isLoading)
    return <LoadingState label="Çalışma masası hazırlanıyor…" />;
  if (ledgersQuery.isError)
    return <ErrorState onRetry={() => void ledgersQuery.refetch()} />;

  const activePlans = allPlans.plans.filter((plan) => plan.status === 'ACTIVE');
  const currency =
    analytics.data?.currency ?? activeLedgers?.[0]?.currency ?? 'TRY';

  return (
    <>
      <PageHeading
        eyebrow="Bugünün kaydı"
        title="Merhaba, hesaplar yerli yerinde."
        description="Defterler, planlar ve son hareketler tek bakışta masanda."
      />

      <section className="overview-hero">
        <div className="overview-hero__copy">
          <span>
            <Sparkles /> Güncel özet
          </span>
          <h2>
            Ortak hesabın
            <br />
            <em>hafızası burada.</em>
          </h2>
          <p>
            Rakamları akılda tutmak yerine, kararları ve güzel planları hatırla.
          </p>
          <Link className="button button--paper" href="/ledgers">
            Defterlere göz at <ArrowRight />
          </Link>
        </div>
        <div className="overview-hero__notebook" aria-hidden="true">
          <span className="overview-hero__tape" />
          <small>MASA NOTU / {new Date().toLocaleDateString('tr-TR')}</small>
          <strong>{activeLedgers?.length ?? 0} açık defter</strong>
          <p>{activePlans.length} plan hâlâ masada</p>
          <span className="handwritten">“yazıldıysa unutulmaz”</span>
        </div>
      </section>

      <section className="stat-grid" aria-label="Genel durum">
        <article className="stat-card">
          <span>
            <BookOpenText />
          </span>
          <div>
            <small>Aktif defter</small>
            <strong>{activeLedgers?.length ?? 0}</strong>
            <p>ortak kayıt alanı</p>
          </div>
        </article>
        <article className="stat-card stat-card--wine">
          <span>
            <NotebookTabs />
          </span>
          <div>
            <small>Aktif plan</small>
            <strong>{activePlans.length}</strong>
            <p>devam eden not</p>
          </div>
        </article>
        <article className="stat-card">
          <span>
            <CircleDollarSign />
          </span>
          <div>
            <small>İlk defter harcaması</small>
            <strong>
              {analytics.data
                ? formatMoneyFromMinor(
                    analytics.data.totalExpenseMinor,
                    currency,
                  )
                : '—'}
            </strong>
            <p>{analytics.data?.expenseCount ?? 0} hareket</p>
          </div>
        </article>
        <article className="stat-card stat-card--gold">
          <span>
            <TrendingUp />
          </span>
          <div>
            <small>Net nakit akışı</small>
            <strong>
              {analytics.data
                ? formatMoneyFromMinor(
                    analytics.data.netCashflowMinor,
                    currency,
                  )
                : '—'}
            </strong>
            <p>ilk aktif defter</p>
          </div>
        </article>
      </section>

      <div className="overview-columns">
        <section>
          <div className="section-heading">
            <div>
              <span className="eyebrow">Masadaki defterler</span>
              <h2>Yakın zamanda açılanlar</h2>
            </div>
            <Link href="/ledgers">
              Tümünü gör <ArrowRight />
            </Link>
          </div>
          <div className="mini-card-grid">
            {(activeLedgers ?? []).slice(0, 2).map((ledger, index) => (
              <LedgerCard ledger={ledger} index={index} key={ledger.id} />
            ))}
            {!activeLedgers?.length ? (
              <div className="inline-note">
                İlk defterini açtığında burada görünecek.
              </div>
            ) : null}
          </div>
        </section>
        <section className="activity-paper">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Son kayıtlar</span>
              <h2>Defter hareketleri</h2>
            </div>
            <Clock3 />
          </div>
          <ol className="activity-list">
            {(activity.data?.items ?? []).map((item) => (
              <li key={item.id}>
                <span />
                <div>
                  <strong>{item.actor?.displayName ?? 'Defterdar'}</strong>
                  <p>
                    {item.entityType.toLocaleLowerCase('tr-TR')} kaydında “
                    {item.action}” işlemi yaptı.
                  </p>
                  <small>
                    {new Date(item.createdAt).toLocaleString('tr-TR')}
                  </small>
                </div>
              </li>
            ))}
            {!activity.isLoading && !activity.data?.items.length ? (
              <li className="activity-list__empty">
                Henüz yeni bir hareket yok.
              </li>
            ) : null}
          </ol>
        </section>
      </div>

      {activePlans.length ? (
        <section className="overview-plans">
          <div className="section-heading">
            <div>
              <span className="eyebrow">İliştirilmiş planlar</span>
              <h2>Sırada ne var?</h2>
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
    </>
  );
}
