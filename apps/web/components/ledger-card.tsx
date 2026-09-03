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
  size?: 'compact' | 'regular' | 'tall';
}

export function LedgerNotebookCard({ ledger, size }: LedgerCardProps) {
  const RoleIcon =
    ledger.role === 'OWNER'
      ? Crown
      : ledger.role === 'ADMIN'
        ? ShieldCheck
        : UserRound;
  const collaborative = Boolean(ledger.isCollaborative);
  const memberCount = ledger.activeMemberCount ?? 1;

  return (
    <Link
      className={`ledger-card${collaborative ? ' ledger-card--collaborative' : ''}${ledger.archivedAt ? ' ledger-card--archived' : ''}${size ? ` workspace-card--${size}` : ''}`}
      href={`/ledgers/${ledger.id}`}
    >
      <span className="ledger-card__rings" aria-hidden="true">
        {Array.from({ length: 5 }, (_, ring) => (
          <i key={ring} />
        ))}
      </span>
      <div className="ledger-card__top">
        <span className="ledger-card__label">
          {collaborative ? 'Ortak defter' : 'Defter'}
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
      <div className="ledger-card__meta">
        <span>
          <RoleIcon /> {ledgerRoleLabel(ledger.role)}
        </span>
        <span>{collaborative ? `${memberCount} kişi` : 'Kişisel'}</span>
        <span>{ledger.activePlanCount ?? '—'} aktif Plan</span>
      </div>
      <strong className="ledger-card__currency">{ledger.currency}</strong>
    </Link>
  );
}

export function LedgerCard(props: LedgerCardProps) {
  return <LedgerNotebookCard {...props} />;
}
