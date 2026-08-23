'use client';

import { Archive, BookOpenCheck, Search, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CreateLedgerDialog } from '@/features/ledgers/create-ledger-dialog';
import { LedgerCard } from '@/components/ledger-card';
import { PageHeading } from '@/components/page-heading';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useLedgers } from '@/features/data/hooks';

type Filter = 'recent' | 'mine' | 'archived';

export default function LedgersPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('recent');
  const ledgers = useLedgers(true);
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
      <PageHeading
        eyebrow="Defterlik"
        title="Her hesabın bir hikâyesi var."
        description="Ortak masrafları ayrı defterlerde tut; neyin nereye ait olduğu karışmasın."
        action={<CreateLedgerDialog />}
      />
      <section className="collection-toolbar" aria-label="Defter filtreleri">
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
      {ledgers.isLoading ? <LoadingState label="Defterlik açılıyor…" /> : null}
      {ledgers.isError ? (
        <ErrorState onRetry={() => void ledgers.refetch()} />
      ) : null}
      {!ledgers.isLoading && !ledgers.isError && filtered.length ? (
        <section className="ledger-grid">
          {filtered.map((ledger, index) => (
            <LedgerCard key={ledger.id} ledger={ledger} index={index} />
          ))}
        </section>
      ) : null}
      {!ledgers.isLoading && !ledgers.isError && !filtered.length ? (
        <EmptyState
          title={search ? 'Bu notu bulamadık' : 'Bu rafta defter yok'}
          description={
            search
              ? 'Başka bir ad ya da kapak notu deneyin.'
              : 'Yeni bir defter açarak ilk kaydı düşebilirsiniz.'
          }
          action={
            !search && filter !== 'archived' ? (
              <CreateLedgerDialog />
            ) : undefined
          }
        />
      ) : null}
    </>
  );
}
