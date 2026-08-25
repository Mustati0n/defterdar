'use client';

import {
  Archive,
  BookOpenCheck,
  BookPlus,
  Search,
  Sparkles,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { LedgerCard } from '@/components/ledger-card';
import { PageHeading } from '@/components/page-heading';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useLedgers } from '@/features/data/hooks';
import { LedgerEmptyState } from '@/features/empty-states/collection-empty-states';
import { PageIntro } from '@/features/page-intro/page-intro';

type Filter = 'recent' | 'mine' | 'archived';

const CreateLedgerDialog = dynamic(
  () =>
    import('@/features/ledgers/create-ledger-dialog').then(
      (module) => module.CreateLedgerDialog,
    ),
  { ssr: false },
);

function LedgersContent() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('recent');
  const [creatorRequested, setCreatorRequested] = useState(false);
  const ledgers = useLedgers(true);
  const createParam = searchParams.get('create');
  const createFromUrl = createParam === '1' || createParam === 'personal';
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('tr-TR');
    return (ledgers.data ?? [])
      .filter((ledger) =>
        filter === 'archived' ? ledger.archivedAt : !ledger.archivedAt,
      )
      .filter((ledger) => filter !== 'mine' || ledger.role === 'OWNER')
      .filter(
        (ledger) =>
          !query ||
          `${ledger.name} ${ledger.description ?? ''}`
            .toLocaleLowerCase('tr-TR')
            .includes(query),
      );
  }, [filter, ledgers.data, search]);

  return (
    <>
      <PageIntro
        pageKey="ledgers"
        title="Defterler uzun süreli kayıt alanlarındır."
        steps={[
          'Ortak giderleri veya yalnız sana ait kayıtları bir Defterde uzun süre tutabilirsin.',
          'Kişisel Defter isteğe bağlıdır; yalnız gerçekten gerektiğinde oluşturulur.',
        ]}
      />
      <PageHeading
        eyebrow="Defterler"
        title="Kişisel ve ortak hesapların"
        description="Harcamaları ait oldukları Defterde düzenle."
        action={
          creatorRequested || createFromUrl ? (
            <CreateLedgerDialog
              key={searchParams.get('create') ?? 'manual'}
              defaultOpen
              defaultType={createParam === 'personal' ? 'PERSONAL' : 'SHARED'}
            />
          ) : (
            <button
              className="button button--primary"
              type="button"
              onClick={() => setCreatorRequested(true)}
            >
              <BookPlus /> Yeni Defter
            </button>
          )
        }
        tools={
          <section
            className="collection-toolbar"
            aria-label="Defter filtreleri"
          >
            <label className="search-box">
              <Search />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Defterlerde ara…"
                aria-label="Defterlerde ara"
              />
            </label>
            <div className="segmented-control">
              <button
                className={filter === 'recent' ? 'is-active' : ''}
                type="button"
                onClick={() => setFilter('recent')}
              >
                <Sparkles /> Son
              </button>
              <button
                className={filter === 'mine' ? 'is-active' : ''}
                type="button"
                onClick={() => setFilter('mine')}
              >
                <BookOpenCheck /> Benimkiler
              </button>
              <button
                className={filter === 'archived' ? 'is-active' : ''}
                type="button"
                onClick={() => setFilter('archived')}
              >
                <Archive /> Arşiv
              </button>
            </div>
            <span className="collection-count">{filtered.length} defter</span>
          </section>
        }
      />
      {ledgers.isLoading ? <LoadingState label="Defterler açılıyor…" /> : null}
      {ledgers.isError ? (
        <ErrorState onRetry={() => void ledgers.refetch()} />
      ) : null}
      {!ledgers.isLoading && !ledgers.isError && filtered.length ? (
        filter === 'recent' && !search ? (
          <>
            {filtered.some((ledger) => ledger.type === 'PERSONAL') ? (
              <section className="collection-section">
                <h2>Kişisel Defter</h2>
                <div className="ledger-grid">
                  {filtered
                    .filter((ledger) => ledger.type === 'PERSONAL')
                    .map((ledger, index) => (
                      <LedgerCard
                        key={ledger.id}
                        ledger={ledger}
                        index={index}
                      />
                    ))}
                </div>
              </section>
            ) : null}
            {filtered.some((ledger) => ledger.type === 'SHARED') ? (
              <section className="collection-section">
                <h2>Ortak Defterler</h2>
                <div className="ledger-grid">
                  {filtered
                    .filter((ledger) => ledger.type === 'SHARED')
                    .map((ledger, index) => (
                      <LedgerCard
                        key={ledger.id}
                        ledger={ledger}
                        index={index}
                      />
                    ))}
                </div>
              </section>
            ) : null}
          </>
        ) : (
          <section className="ledger-grid">
            {filtered.map((ledger, index) => (
              <LedgerCard key={ledger.id} ledger={ledger} index={index} />
            ))}
          </section>
        )
      ) : null}
      {!ledgers.isLoading &&
      !ledgers.isError &&
      !search &&
      filter === 'recent' &&
      !(ledgers.data ?? []).some(
        (ledger) => ledger.type === 'SHARED' && !ledger.archivedAt,
      ) ? (
        <LedgerEmptyState />
      ) : null}
      {!ledgers.isLoading &&
      !ledgers.isError &&
      !filtered.length &&
      (Boolean(search) || filter === 'archived') ? (
        <EmptyState
          title={search ? 'Bu notu bulamadık' : 'Bu rafta defter yok'}
          description={
            search
              ? 'Başka bir ad ya da açıklama deneyin.'
              : 'Yeni bir defter açarak ilk kaydı düşebilirsiniz.'
          }
        />
      ) : null}
    </>
  );
}

export default function LedgersPage() {
  return (
    <Suspense fallback={<LoadingState label="Defterler açılıyor…" />}>
      <LedgersContent />
    </Suspense>
  );
}
