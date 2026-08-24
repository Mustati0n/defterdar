'use client';

import { Archive, CheckCircle2, Clock3, Search } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { PageHeading } from '@/components/page-heading';
import { PlanCard } from '@/components/plan-card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useAllPlans, useLedgers } from '@/features/data/hooks';
import { CreatePlanDialog } from '@/features/plans/create-plan-dialog';
import type { PlanStatus } from '@/lib/types';
import { PlanEmptyState } from '@/features/empty-states/collection-empty-states';

function PlansContent() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<PlanStatus>('ACTIVE');
  const ledgers = useLedgers();
  const allPlans = useAllPlans(ledgers.data, true);
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('tr-TR');
    return allPlans.plans
      .filter((plan) => plan.status === filter)
      .filter(
        (plan) =>
          !query ||
          `${plan.name} ${plan.description ?? ''}`
            .toLocaleLowerCase('tr-TR')
            .includes(query),
      );
  }, [allPlans.plans, filter, search]);

  return (
    <>
      <PageHeading
        eyebrow="Planlar"
        title="Planlarını ve hesaplarını birlikte yönet"
        description="Gezi, kutlama ve etkinlik harcamalarını ilgili Defterle birlikte tut."
        action={
          <CreatePlanDialog
            key={`${searchParams.get('create')}:${searchParams.get('ledgerId')}`}
            ledgers={ledgers.data ?? []}
            defaultOpen={searchParams.get('create') === '1'}
            initialLedgerId={searchParams.get('ledgerId') ?? ''}
          />
        }
      />
      <section className="collection-toolbar" aria-label="Plan filtreleri">
        <label className="search-box">
          <Search />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Planlarda ara…"
            aria-label="Planlarda ara"
          />
        </label>
        <div className="segmented-control">
          <button
            className={filter === 'ACTIVE' ? 'is-active' : ''}
            type="button"
            onClick={() => setFilter('ACTIVE')}
          >
            <Clock3 /> Aktif
          </button>
          <button
            className={filter === 'COMPLETED' ? 'is-active' : ''}
            type="button"
            onClick={() => setFilter('COMPLETED')}
          >
            <CheckCircle2 /> Biten
          </button>
          <button
            className={filter === 'ARCHIVED' ? 'is-active' : ''}
            type="button"
            onClick={() => setFilter('ARCHIVED')}
          >
            <Archive /> Arşiv
          </button>
        </div>
        <span className="collection-count">{filtered.length} plan</span>
      </section>
      {ledgers.isLoading || allPlans.isLoading ? (
        <LoadingState label="Plan notları toplanıyor…" />
      ) : null}
      {ledgers.isError || allPlans.isError ? (
        <ErrorState
          onRetry={() => {
            void ledgers.refetch();
            void allPlans.refetch();
          }}
        />
      ) : null}
      {!ledgers.isLoading &&
      !allPlans.isLoading &&
      !ledgers.isError &&
      !allPlans.isError &&
      filtered.length ? (
        <section className="plan-grid">
          {filtered.map((plan, index) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              ledger={ledgers.data?.find(
                (ledger) => ledger.id === plan.ledgerId,
              )}
              index={index}
            />
          ))}
        </section>
      ) : null}
      {!ledgers.isLoading &&
      !allPlans.isLoading &&
      !ledgers.isError &&
      !allPlans.isError &&
      !search &&
      filter === 'ACTIVE' &&
      !filtered.length ? (
        <PlanEmptyState
          ledgerId={
            ledgers.data?.find((ledger) => ledger.type === 'PERSONAL')?.id
          }
        />
      ) : null}
      {!ledgers.isLoading &&
      !allPlans.isLoading &&
      !ledgers.isError &&
      !allPlans.isError &&
      !filtered.length &&
      (Boolean(search) || filter !== 'ACTIVE') ? (
        <EmptyState
          title="Bu panoda plan yok"
          description={
            search
              ? 'Arama kelimesini değiştirip tekrar deneyin.'
              : 'Yeni bir plan ekleyip defterine iliştirebilirsiniz.'
          }
        />
      ) : null}
    </>
  );
}

export default function PlansPage() {
  return (
    <Suspense fallback={<LoadingState label="Plan notları toplanıyor…" />}>
      <PlansContent />
    </Suspense>
  );
}
