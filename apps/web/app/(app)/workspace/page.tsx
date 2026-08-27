'use client';

import {
  Archive,
  BookOpenText,
  CalendarPlus,
  ChevronDown,
  Clock3,
  Layers3,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { LedgerCard } from '@/components/ledger-card';
import { PageHeading } from '@/components/page-heading';
import { PlanCard } from '@/components/plan-card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useAllPlans, useLedgers } from '@/features/data/hooks';
import type { Ledger, Plan } from '@/lib/types';

type WorkspaceFilter = 'recent' | 'active' | 'archived';
type ItemType = 'all' | 'ledger' | 'plan';
type WorkspaceItem =
  { kind: 'ledger'; value: Ledger } | { kind: 'plan'; value: Plan };

const CreateLedgerDialog = dynamic(
  () =>
    import('@/features/ledgers/create-ledger-dialog').then(
      (module) => module.CreateLedgerDialog,
    ),
  { ssr: false },
);
const CreatePlanDialog = dynamic(
  () =>
    import('@/features/plans/create-plan-dialog').then(
      (module) => module.CreatePlanDialog,
    ),
  { ssr: false },
);

export function filterWorkspaceItems(
  ledgers: Ledger[],
  plans: Plan[],
  filter: WorkspaceFilter,
  itemType: ItemType,
  search: string,
) {
  const query = search.trim().toLocaleLowerCase('tr-TR');
  const items: WorkspaceItem[] = [
    ...ledgers.map((value): WorkspaceItem => ({ kind: 'ledger', value })),
    ...plans.map((value): WorkspaceItem => ({ kind: 'plan', value })),
  ];
  return items
    .filter((item) => itemType === 'all' || item.kind === itemType)
    .filter((item) => {
      if (item.kind === 'ledger')
        return filter === 'archived'
          ? Boolean(item.value.archivedAt)
          : !item.value.archivedAt;
      if (filter === 'archived') return item.value.status === 'ARCHIVED';
      if (filter === 'active') return item.value.status === 'ACTIVE';
      return item.value.status !== 'ARCHIVED';
    })
    .filter(
      (item) =>
        !query ||
        `${item.value.name} ${item.value.description ?? ''}`
          .toLocaleLowerCase('tr-TR')
          .includes(query),
    )
    .sort(
      (left, right) =>
        new Date(right.value.updatedAt).getTime() -
        new Date(left.value.updatedAt).getTime(),
    );
}

function cardSize(item: WorkspaceItem): 'compact' | 'regular' | 'tall' {
  const descriptionLength = item.value.description?.length ?? 0;
  const people =
    item.kind === 'ledger'
      ? (item.value.activeMemberCount ?? 1)
      : item.value.participantCount;
  if (descriptionLength > 110 || people >= 6) return 'tall';
  if (descriptionLength > 0 || people >= 3) return 'regular';
  return 'compact';
}

function WorkspaceContent() {
  const searchParams = useSearchParams();
  const requestedType = searchParams.get('type');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<WorkspaceFilter>('recent');
  const [itemType, setItemType] = useState<ItemType>(
    requestedType === 'ledger' || requestedType === 'plan'
      ? requestedType
      : 'all',
  );
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [creator, setCreator] = useState<'ledger' | 'plan' | null>(() => {
    const requestedCreate = searchParams.get('create');
    return requestedCreate === 'ledger' || requestedCreate === 'plan'
      ? requestedCreate
      : null;
  });
  const createMenuRef = useRef<HTMLDivElement>(null);
  const ledgers = useLedgers(true);
  const plans = useAllPlans(true);

  useEffect(() => {
    if (!createMenuOpen) return;
    const close = (event: MouseEvent) => {
      if (!createMenuRef.current?.contains(event.target as Node))
        setCreateMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [createMenuOpen]);

  const filtered = useMemo(
    () =>
      filterWorkspaceItems(
        ledgers.data ?? [],
        plans.data ?? [],
        filter,
        itemType,
        search,
      ),
    [filter, itemType, ledgers.data, plans.data, search],
  );
  const isLoading = ledgers.isLoading || plans.isLoading;
  const isError = ledgers.isError || plans.isError;

  return (
    <>
      <PageHeading
        eyebrow="Çalışma alanı"
        title="Defterler & Planlar"
        description="Uzun süreli hesaplarını ve etkinlik planlarını aynı rafta yönet."
        action={
          <div className="workspace-create" ref={createMenuRef}>
            <button
              className="button button--primary"
              type="button"
              aria-expanded={createMenuOpen}
              aria-haspopup="menu"
              onClick={() => setCreateMenuOpen((current) => !current)}
            >
              <Plus /> Yeni <ChevronDown />
            </button>
            {createMenuOpen ? (
              <div className="workspace-create__menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setCreator('ledger');
                    setCreateMenuOpen(false);
                  }}
                >
                  <BookOpenText />
                  <span>
                    <strong>Yeni Defter</strong>
                    <small>Düzenli bir hesap aç</small>
                  </span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setCreator('plan');
                    setCreateMenuOpen(false);
                  }}
                >
                  <CalendarPlus />
                  <span>
                    <strong>Yeni Plan</strong>
                    <small>Bir etkinlik planla</small>
                  </span>
                </button>
              </div>
            ) : null}
          </div>
        }
        tools={
          <section
            className="collection-toolbar"
            aria-label="Çalışma alanı filtreleri"
          >
            <label className="search-box">
              <Search />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Defter ve planlarda ara…"
                aria-label="Defter ve planlarda ara"
              />
            </label>
            <div className="segmented-control" aria-label="Durum">
              <button
                className={filter === 'recent' ? 'is-active' : ''}
                type="button"
                onClick={() => setFilter('recent')}
              >
                <Sparkles /> Son
              </button>
              <button
                className={filter === 'active' ? 'is-active' : ''}
                type="button"
                onClick={() => setFilter('active')}
              >
                <Clock3 /> Aktif
              </button>
              <button
                className={filter === 'archived' ? 'is-active' : ''}
                type="button"
                onClick={() => setFilter('archived')}
              >
                <Archive /> Arşiv
              </button>
            </div>
            <div
              className="segmented-control workspace-type-filter"
              aria-label="Tür"
            >
              <button
                className={itemType === 'all' ? 'is-active' : ''}
                type="button"
                onClick={() => setItemType('all')}
              >
                <Layers3 /> Tümü
              </button>
              <button
                className={itemType === 'ledger' ? 'is-active' : ''}
                type="button"
                onClick={() => setItemType('ledger')}
              >
                Defter
              </button>
              <button
                className={itemType === 'plan' ? 'is-active' : ''}
                type="button"
                onClick={() => setItemType('plan')}
              >
                Plan
              </button>
            </div>
            <span className="collection-count">{filtered.length} kayıt</span>
          </section>
        }
      />
      {isLoading ? <LoadingState label="Çalışma alanı hazırlanıyor…" /> : null}
      {isError ? (
        <ErrorState
          onRetry={() => {
            void ledgers.refetch();
            void plans.refetch();
          }}
        />
      ) : null}
      {!isLoading && !isError && filtered.length ? (
        <section className="workspace-grid" aria-label="Defterler ve Planlar">
          {filtered.map((item, index) =>
            item.kind === 'ledger' ? (
              <LedgerCard
                key={`ledger:${item.value.id}`}
                ledger={item.value}
                index={index}
                size={cardSize(item)}
              />
            ) : (
              <PlanCard
                key={`plan:${item.value.id}`}
                plan={item.value}
                ledger={(ledgers.data ?? []).find(
                  (ledger) => ledger.id === item.value.ledgerId,
                )}
                index={index}
                size={cardSize(item)}
              />
            ),
          )}
        </section>
      ) : null}
      {!isLoading && !isError && !filtered.length ? (
        <EmptyState
          title={search ? 'Bu kaydı bulamadık' : 'Bu rafta kayıt yok'}
          description={
            search
              ? 'Başka bir ad veya açıklama deneyin.'
              : filter === 'archived'
                ? 'Arşivlenen Defter ve Planlar burada görünür.'
                : 'Yeni menüsünden ilk Defterini ya da Planını oluşturabilirsin.'
          }
        />
      ) : null}
      <CreateLedgerDialog
        open={creator === 'ledger'}
        onOpenChange={(open) => !open && setCreator(null)}
        hideTrigger
      />
      <CreatePlanDialog
        ledgers={ledgers.data ?? []}
        open={creator === 'plan'}
        onOpenChange={(open) => !open && setCreator(null)}
        initialLedgerId={searchParams.get('ledgerId') ?? ''}
        hideTrigger
      />
    </>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={<LoadingState label="Çalışma alanı hazırlanıyor…" />}>
      <WorkspaceContent />
    </Suspense>
  );
}
