'use client';

import {
  Archive,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  Search,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { PageHeading } from '@/components/page-heading';
import { PlanCard } from '@/components/plan-card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useAllPlans, useLedgers } from '@/features/data/hooks';
import type { PlanStatus } from '@/lib/types';
import { PlanEmptyState } from '@/features/empty-states/collection-empty-states';

const CreatePlanDialog = dynamic(
  () =>
    import('@/features/plans/create-plan-dialog').then(
      (module) => module.CreatePlanDialog,
    ),
  { ssr: false },
);

function PlansContent() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<PlanStatus>('ACTIVE');
  const [creatorRequested, setCreatorRequested] = useState(false);
  const ledgers = useLedgers();
  const allPlans = useAllPlans(true);
  const createFromUrl = searchParams.get('create') === '1';
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('tr-TR');
    return (allPlans.data ?? [])
      .filter((plan) => plan.status === filter)
      .filter(
        (plan) =>
          !query ||
          `${plan.name} ${plan.description ?? ''}`
            .toLocaleLowerCase('tr-TR')
            .includes(query),
      );
  }, [allPlans.data, filter, search]);

  return (
    <>
      <PageHeading
        eyebrow="Planlar"
        title="Planlarını ve hesaplarını birlikte yönet"
        description="Gezi, kutlama ve etkinlik harcamalarını ilgili Defterle birlikte tut."
        action={
          creatorRequested || createFromUrl ? (
            <CreatePlanDialog
              key={`${searchParams.get('create')}:${searchParams.get('ledgerId')}`}
              ledgers={ledgers.data ?? []}
              defaultOpen
              initialLedgerId={searchParams.get('ledgerId') ?? ''}
            />
          ) : (
            <button
              className="button button--primary"
              type="button"
              disabled={!ledgers.data?.length}
              onClick={() => setCreatorRequested(true)}
            >
              <CalendarPlus /> Yeni Plan
            </button>
          )
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
