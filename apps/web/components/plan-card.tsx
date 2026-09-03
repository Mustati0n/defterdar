import {
  Archive,
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  Clock3,
  UsersRound,
} from 'lucide-react';
import Link from 'next/link';
import { formatDate, planStatusLabel } from '@/lib/format';
import type { Ledger, Plan } from '@/lib/types';

export function PlanCard({
  plan,
  ledger,
  size,
}: {
  plan: Plan;
  ledger?: Ledger;
  size?: 'compact' | 'regular' | 'tall';
}) {
  const StatusIcon =
    plan.status === 'ACTIVE'
      ? Clock3
      : plan.status === 'COMPLETED'
        ? CheckCircle2
        : Archive;

  return (
    <Link
      className={`plan-card${size ? ` workspace-card--${size}` : ''}`}
      href={`/plans/${plan.id}`}
    >
      <div className="plan-card__heading">
        <span className="plan-card__label">Plan</span>
        <h3>{plan.name}</h3>
        <span
          className={`status-chip status-chip--${plan.status.toLowerCase()}`}
        >
          <StatusIcon />
          {planStatusLabel(plan.status)}
        </span>
      </div>
      <dl className="plan-card__facts">
        <div>
          <dt>
            <CalendarDays /> Tarih
          </dt>
          <dd>{formatDate(plan.startsAt, 'Başlangıç serbest')}</dd>
        </div>
        <div>
          <dt>
            <UsersRound /> Katılımcı
          </dt>
          <dd>{plan.participantCount} kişi</dd>
        </div>
      </dl>
      {plan.description ? (
        <p className="plan-card__description">{plan.description}</p>
      ) : null}
      <div className="plan-card__context">
        <BookOpenText />
        <span>
          <small>{ledger ? 'Bağlı Defter' : 'Kapsam'}</small>
          <strong>{ledger ? `${ledger.name} içinde` : 'Bağımsız Plan'}</strong>
        </span>
        {!ledger ? <b>{plan.currency}</b> : null}
      </div>
    </Link>
  );
}
