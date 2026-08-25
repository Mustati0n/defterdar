import {
  Archive,
  ArrowUpRight,
  Crown,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import type { Ledger } from '@/lib/types';
import { ledgerRoleLabel } from '@/lib/format';

interface LedgerCardProps {
  ledger: Ledger;
  index?: number;
}

export function LedgerNotebookCard({ ledger }: LedgerCardProps) {
  const RoleIcon =
    ledger.role === 'OWNER'
      ? Crown
      : ledger.role === 'ADMIN'
        ? ShieldCheck
        : UserRound;

  return (
    <Link
      className={`ledger-card ledger-card--${ledger.type.toLowerCase()}${ledger.archivedAt ? ' ledger-card--archived' : ''}`}
      href={`/ledgers/${ledger.id}`}
    >
      <span className="ledger-card__rings" aria-hidden="true">
        {Array.from({ length: 7 }, (_, ring) => (
          <i key={ring} />
        ))}
      </span>
      <div className="ledger-card__top">
        <span className="ledger-card__label">
          {ledger.type === 'PERSONAL' ? 'Kişisel defter' : 'Ortak defter'}
        </span>
        {ledger.archivedAt ? (
          <span className="status-chip status-chip--muted">
            <Archive /> Arşiv
          </span>
        ) : (
          <ArrowUpRight />
        )}
      </div>
      <h3>{ledger.name}</h3>
      {ledger.description ? <p>{ledger.description}</p> : null}
      <div className="ledger-card__rule" />
      <div className="ledger-card__meta">
        <span>
          <RoleIcon /> {ledgerRoleLabel(ledger.role)}
        </span>
        <span>
          {ledger.type === 'SHARED'
            ? `${ledger.activeMemberCount ?? '—'} üye · `
            : 'Kişisel · '}
          {ledger.activePlanCount ?? '—'} aktif Plan
        </span>
        <strong>{ledger.currency}</strong>
      </div>
    </Link>
  );
}

export function LedgerCard(props: LedgerCardProps) {
  return <LedgerNotebookCard {...props} />;
}
