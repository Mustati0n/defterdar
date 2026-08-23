import { BookPlus, NotebookTabs, Plus } from 'lucide-react';
import Link from 'next/link';

export function LedgerEmptyState() {
  return (
    <div
      className="smart-empty smart-empty--collection"
      data-testid="ledger-empty-state"
    >
      <span>
        <BookPlus />
      </span>
      <div>
        <h3>Henüz ortak bir Defterin yok.</h3>
        <p>
          Ev arkadaşların, arkadaş grubun veya düzenli giderlerini tek yerde
          takip etmek için bir Defter oluştur.
        </p>
      </div>
      <Link className="button button--primary" href="/ledgers?create=1">
        <Plus /> Defter oluştur
      </Link>
    </div>
  );
}

export function PlanEmptyState({ ledgerId }: { ledgerId?: string }) {
  const suffix = ledgerId ? `&ledgerId=${ledgerId}` : '';
  return (
    <div
      className="smart-empty smart-empty--collection"
      data-testid="plan-empty-state"
    >
      <span>
        <NotebookTabs />
      </span>
      <div>
        <h3>Henüz bir Plan yok.</h3>
        <p>
          Gezi, yemek, piknik veya kısa süreli ortak masraflar için bir Plan
          oluşturabilirsin.
        </p>
      </div>
      <Link
        className="button button--primary"
        href={`/plans?create=1${suffix}`}
      >
        <Plus /> Plan oluştur
      </Link>
    </div>
  );
}
