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
import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { LedgerCard } from '@/components/ledger-card';
import { PageHeading } from '@/components/page-heading';
import { PlanCard } from '@/components/plan-card';
import { AnchoredMenu } from '@/components/ui/anchored-menu';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useAllPlans, useLedgers } from '@/features/data/hooks';
import type { Ledger, Plan } from '@/lib/types';

type WorkspaceFilter = 'recent' | 'active' | 'archived';
type ItemType = 'all' | 'ledger' | 'plan';
export type WorkspaceItem =
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
  includeLinkedPlans = false,
) {
  const query = search.trim().toLocaleLowerCase('tr-TR');
  const items: WorkspaceItem[] = [
    ...ledgers.map((value): WorkspaceItem => ({ kind: 'ledger', value })),
    ...plans.map((value): WorkspaceItem => ({ kind: 'plan', value })),
  ];
  return items
    .filter((item) => itemType === 'all' || item.kind === itemType)
    .filter(
      (item) =>
        item.kind === 'ledger' ||
        includeLinkedPlans ||
        item.value.scope === 'STANDALONE',
    )
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

export function workspaceCardSize(
  item: WorkspaceItem,
): 'compact' | 'regular' | 'tall' {
  if (item.kind === 'ledger') return 'compact';

  const descriptionLength = item.value.description?.length ?? 0;
  let density = 0;
  if (descriptionLength > 120) density += 2;
  else if (descriptionLength > 0) density += 1;
  if (item.value.name.length > 42) density += 1;
  if (item.value.participantCount >= 6) density += 1;
  if (item.value.startsAt && item.value.endsAt) density += 1;

  if (density >= 3) return 'tall';
  if (density >= 1) return 'regular';
  return 'compact';
}

const WORKSPACE_EXIT_MS = 220;

function workspaceItemKey(item: WorkspaceItem) {
  return `${item.kind}:${item.value.id}`;
}

function motionIsReduced() {
  return (
    document.documentElement.dataset.motion === 'reduced' ||
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}

function WorkspaceBoard({
  items,
  ledgers,
  exitingLinkedPlans,
}: {
  items: WorkspaceItem[];
  ledgers: Ledger[];
  exitingLinkedPlans: boolean;
}) {
  const boardRef = useRef<HTMLElement>(null);
  const positionsRef = useRef(new Map<string, DOMRect>());
  const initializedRef = useRef(false);

  useLayoutEffect(() => {
    const cards = Array.from(
      boardRef.current?.querySelectorAll<HTMLElement>('[data-workspace-key]') ??
        [],
    );
    const currentPositions = new Map(
      cards.map((card) => [
        card.dataset.workspaceKey ?? '',
        card.getBoundingClientRect(),
      ]),
    );

    if (initializedRef.current && !motionIsReduced()) {
      for (const card of cards) {
        if (typeof card.animate !== 'function') continue;
        const previous = positionsRef.current.get(
          card.dataset.workspaceKey ?? '',
        );
        if (!previous) {
          card.animate(
            [
              { opacity: 0, transform: 'translateY(10px) scale(0.985)' },
              { opacity: 1, transform: 'translateY(0) scale(1)' },
            ],
            {
              duration: 220,
              easing: 'cubic-bezier(0, 0, 0.2, 1)',
            },
          );
          continue;
        }

        const current = currentPositions.get(card.dataset.workspaceKey ?? '');
        if (!current) continue;
        const deltaX = previous.left - current.left;
        const deltaY = previous.top - current.top;
        if (!deltaX && !deltaY) continue;
        card.animate(
          [
            { transform: `translate(${deltaX}px, ${deltaY}px)` },
            { transform: 'translate(0, 0)' },
          ],
          {
            duration: 240,
            easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
          },
        );
      }
    }

    initializedRef.current = true;
    positionsRef.current = currentPositions;
  }, [exitingLinkedPlans, items]);

  return (
    <section
      ref={boardRef}
      className="workspace-grid"
      aria-label="Defterler ve Planlar"
      data-layout="controlled-masonry"
    >
      {items.map((item) => {
        const size = workspaceCardSize(item);
        const linkedPlan =
          item.kind === 'plan' && item.value.scope === 'LEDGER';
        return (
          <div
            key={workspaceItemKey(item)}
            className={`workspace-grid__item workspace-grid__item--${item.kind} workspace-card--${size}${exitingLinkedPlans && linkedPlan ? ' is-exiting' : ''}`}
            data-workspace-key={workspaceItemKey(item)}
          >
            {item.kind === 'ledger' ? (
              <LedgerCard ledger={item.value} size={size} />
            ) : (
              <PlanCard
                plan={item.value}
                ledger={ledgers.find(
                  (ledger) => ledger.id === item.value.ledgerId,
                )}
                size={size}
              />
            )}
          </div>
        );
      })}
    </section>
  );
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
  const [includeLinkedPlans, setIncludeLinkedPlans] = useState(false);
  const [renderLinkedPlans, setRenderLinkedPlans] = useState(false);
  const [exitingLinkedPlans, setExitingLinkedPlans] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [creator, setCreator] = useState<'ledger' | 'plan' | null>(() => {
    const requestedCreate = searchParams.get('create');
    return requestedCreate === 'ledger' || requestedCreate === 'plan'
      ? requestedCreate
      : null;
  });
  const createMenuRef = useRef<HTMLDivElement>(null);
  const createTriggerRef = useRef<HTMLButtonElement>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ledgers = useLedgers(true);
  const plans = useAllPlans(true);

  useEffect(() => {
    if (!createMenuOpen) return;
    const close = (event: MouseEvent) => {
      if (
        !createMenuRef.current?.contains(event.target as Node) &&
        !(event.target as Element).closest?.('[data-anchored-menu]')
      )
        setCreateMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [createMenuOpen]);

  useEffect(
    () => () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    },
    [],
  );

  const setLinkedPlansVisibility = (visible: boolean) => {
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    exitTimerRef.current = null;
    setIncludeLinkedPlans(visible);

    if (visible) {
      setExitingLinkedPlans(false);
      setRenderLinkedPlans(true);
      return;
    }
    if (motionIsReduced()) {
      setExitingLinkedPlans(false);
      setRenderLinkedPlans(false);
      return;
    }

    setExitingLinkedPlans(true);
    exitTimerRef.current = setTimeout(() => {
      setRenderLinkedPlans(false);
      setExitingLinkedPlans(false);
      exitTimerRef.current = null;
    }, WORKSPACE_EXIT_MS);
  };

  const filtered = useMemo(
    () =>
      filterWorkspaceItems(
        ledgers.data ?? [],
        plans.data ?? [],
        filter,
        itemType,
        search,
        renderLinkedPlans,
      ),
    [filter, itemType, ledgers.data, plans.data, renderLinkedPlans, search],
  );
  const isLoading = ledgers.isLoading || plans.isLoading;
  const isError = ledgers.isError || plans.isError;

  return (
    <>
      <PageHeading
        eyebrow="Çalışma alanı"
        title="Defterler & Planlar"
        description="Defterlerini ve bağımsız planlarını tek yerden yönet."
        variant="compact"
        action={
          <div className="workspace-heading-actions">
            <output className="workspace-heading-count" aria-live="polite">
              {filtered.length} kayıt
            </output>
            <button
              className="workspace-scope-filter workspace-scope-filter--header"
              type="button"
              role="switch"
              aria-checked={includeLinkedPlans}
              aria-describedby="workspace-scope-help"
              disabled={itemType === 'ledger'}
              onClick={() => setLinkedPlansVisibility(!includeLinkedPlans)}
            >
              <span
                className="workspace-scope-filter__track"
                aria-hidden="true"
              >
                <span />
              </span>
              <span className="workspace-scope-filter__copy">
                <strong>Defterlere bağlı planları göster</strong>
              </span>
              <span
                id="workspace-scope-help"
                className="workspace-visually-hidden"
              >
                {itemType === 'ledger'
                  ? 'Defter filtresinde uygulanmaz.'
                  : 'Kapalıyken yalnızca bağımsız planlar gösterilir.'}
              </span>
            </button>
            <div className="workspace-create" ref={createMenuRef}>
              <button
                ref={createTriggerRef}
                className="button button--primary"
                type="button"
                aria-expanded={createMenuOpen}
                aria-haspopup="menu"
                onClick={() => setCreateMenuOpen((current) => !current)}
              >
                <Plus /> Yeni <ChevronDown />
              </button>
              <AnchoredMenu
                anchorRef={createTriggerRef}
                open={createMenuOpen}
                onDismiss={() => setCreateMenuOpen(false)}
                className="workspace-create__menu"
              >
                <div role="menu">
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
              </AnchoredMenu>
            </div>
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
            <fieldset className="workspace-filter-group workspace-status-filter">
              <legend>Durum</legend>
              <div className="segmented-control">
                <button
                  className={filter === 'recent' ? 'is-active' : ''}
                  type="button"
                  aria-pressed={filter === 'recent'}
                  onClick={() => setFilter('recent')}
                >
                  <Sparkles /> Son
                </button>
                <button
                  className={filter === 'active' ? 'is-active' : ''}
                  type="button"
                  aria-pressed={filter === 'active'}
                  onClick={() => setFilter('active')}
                >
                  <Clock3 /> Aktif
                </button>
                <button
                  className={filter === 'archived' ? 'is-active' : ''}
                  type="button"
                  aria-pressed={filter === 'archived'}
                  onClick={() => setFilter('archived')}
                >
                  <Archive /> Arşiv
                </button>
              </div>
            </fieldset>
            <fieldset className="workspace-filter-group workspace-type-filter">
              <legend>Tür</legend>
              <div className="segmented-control">
                <button
                  className={itemType === 'all' ? 'is-active' : ''}
                  type="button"
                  aria-pressed={itemType === 'all'}
                  onClick={() => setItemType('all')}
                >
                  <Layers3 /> Tümü
                </button>
                <button
                  className={itemType === 'ledger' ? 'is-active' : ''}
                  type="button"
                  aria-pressed={itemType === 'ledger'}
                  onClick={() => setItemType('ledger')}
                >
                  Defter
                </button>
                <button
                  className={itemType === 'plan' ? 'is-active' : ''}
                  type="button"
                  aria-pressed={itemType === 'plan'}
                  onClick={() => setItemType('plan')}
                >
                  Plan
                </button>
              </div>
            </fieldset>
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
        <WorkspaceBoard
          items={filtered}
          ledgers={ledgers.data ?? []}
          exitingLinkedPlans={exitingLinkedPlans}
        />
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
