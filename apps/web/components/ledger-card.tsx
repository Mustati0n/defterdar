import {
  Archive,
  ArrowUpRight,
  Crown,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import type { Ledger } from '@/lib/types';

const roleLabels = {
  OWNER: 'Sahibi',
  ADMIN: 'Yönetici',
  MEMBER: 'Üye',
} as const;

export function LedgerCard({
  ledger,
  index = 0,
}: {
  ledger: Ledger;
  index?: number;
}) {
  const variants = ['notebook', 'paper', 'stitched'] as const;
  const variant = variants[index % variants.length];
  const RoleIcon =
    ledger.role === 'OWNER'
      ? Crown
      : ledger.role === 'ADMIN'
        ? ShieldCheck
        : UserRound;

  return (
    <Link
      className={`ledger-card ledger-card--${variant}${ledger.archivedAt ? ' ledger-card--archived' : ''}`}
      href={`/ledgers/${ledger.id}`}
    >
      {variant === 'notebook' ? (
        <span className="ledger-card__rings" aria-hidden="true">
          {Array.from({ length: 7 }, (_, ring) => (
            <i key={ring} />
          ))}
        </span>
      ) : null}
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
      <p>
        {ledger.description || 'Henüz bu deftere bir kapak notu düşülmedi.'}
      </p>
      <div className="ledger-card__rule" />
      <div className="ledger-card__meta">
        <span>
          <RoleIcon /> {roleLabels[ledger.role]}
        </span>
        <strong>{ledger.currency}</strong>
      </div>
    </Link>
  );
}
