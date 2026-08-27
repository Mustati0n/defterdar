import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  UsersRound,
} from 'lucide-react';
import Link from 'next/link';
import { formatDate, planStatusLabel } from '@/lib/format';
import type { Ledger, Plan } from '@/lib/types';

export function PlanCard({
  plan,
  ledger,
  index = 0,
  size,
}: {
  plan: Plan;
  ledger?: Ledger;
  index?: number;
  size?: 'compact' | 'regular' | 'tall';
}) {
  const variant = index % 2 === 0 ? 'checklist' : 'ticket';
  return (
    <Link
      className={`plan-card plan-card--${variant}${size ? ` workspace-card--${size}` : ''}`}
      href={`/plans/${plan.id}`}
    >
      <span className="plan-card__pin" aria-hidden="true" />
      <div className="plan-card__top">
        <span
          className={`status-chip status-chip--${plan.status.toLowerCase()}`}
        >
          {plan.status === 'ACTIVE' ? <Clock3 /> : <CheckCircle2 />}
          {planStatusLabel(plan.status)}
        </span>
        <span className="plan-card__number">
          #{String(index + 1).padStart(2, '0')}
        </span>
      </div>
      <h3>{plan.name}</h3>
      {plan.description ? <p>{plan.description}</p> : null}
      <ul className="plan-card__list">
        <li>
          <CalendarDays /> {formatDate(plan.startsAt, 'Başlangıç serbest')}
        </li>
        <li>
          <UsersRound /> {plan.participantCount} katılımcı
        </li>
        {ledger ? (
          <li>
            <MapPin /> {ledger.name}
          </li>
        ) : (
          <li>
            <MapPin /> Bağımsız Plan · {plan.currency}
          </li>
        )}
      </ul>
    </Link>
  );
}
