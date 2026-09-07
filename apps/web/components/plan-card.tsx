import {
  Archive,
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  Clock3,
  UsersRound,
} from 'lucide-react';
import {
  formatDate,
  formatMoneyFromMinor,
  planStatusLabel,
} from '@/lib/format';
import type { Ledger, Plan } from '@/lib/types';
import { CardDetailLink } from '@/components/card-detail-transition';

function overviewDateLabel(plan: Plan, referenceTime: number) {
  if (!plan.startsAt) return 'Tarih belirtilmedi';

  const start = new Date(plan.startsAt);
  const reference = new Date(referenceTime);
  const day = 24 * 60 * 60 * 1000;
  const startDay = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
  );
  const referenceDay = Date.UTC(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate(),
  );
  const daysUntilStart = Math.round((startDay - referenceDay) / day);

  if (daysUntilStart > 1) return `${daysUntilStart} gün kaldı`;
  if (daysUntilStart === 1) return 'Yarın başlıyor';
  if (daysUntilStart === 0) return 'Bugün başlıyor';

  if (plan.endsAt && new Date(plan.endsAt).getTime() >= referenceTime) {
    return `${formatDate(plan.endsAt)} tarihine kadar`;
  }

  return 'Devam ediyor';
}

export function PlanCard({
  plan,
  ledger,
  size,
  variant = 'default',
  netMinor = 0,
  referenceTime,
}: {
  plan: Plan;
  ledger?: Ledger;
  size?: 'compact' | 'regular' | 'tall';
  variant?: 'default' | 'overview';
  netMinor?: number;
  referenceTime?: number;
}) {
  const overview = variant === 'overview';
  const StatusIcon =
    plan.status === 'ACTIVE'
      ? Clock3
      : plan.status === 'COMPLETED'
        ? CheckCircle2
        : Archive;

  return (
    <CardDetailLink
      className={`plan-card${overview ? ' plan-card--overview' : ''}${size ? ` workspace-card--${size}` : ''}`}
      href={`/plans/${plan.id}`}
      transitionKey={`plan:${plan.id}`}
    >
      <div className="plan-card__heading">
        {!overview ? <span className="plan-card__label">Plan</span> : null}
        <h3>{plan.name}</h3>
        {!overview ? (
          <span
            className={`status-chip status-chip--${plan.status.toLowerCase()}`}
          >
            <StatusIcon />
            {planStatusLabel(plan.status)}
          </span>
        ) : null}
      </div>
      {overview ? (
        <>
          <div className="plan-card__overview-date">
            <CalendarDays />
            <strong>
              {overviewDateLabel(
                plan,
                referenceTime ?? new Date(plan.updatedAt).getTime(),
              )}
            </strong>
          </div>
          <div className="plan-card__overview-meta">
            <span>
              <UsersRound /> {plan.participantCount} kişi
            </span>
            {netMinor ? (
              <span>
                {formatMoneyFromMinor(Math.abs(netMinor), plan.currency)}{' '}
                {netMinor > 0 ? 'alacağın' : 'ödemen'} var
              </span>
            ) : null}
          </div>
        </>
      ) : (
        <>
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
              <strong>
                {ledger ? `${ledger.name} içinde` : 'Bağımsız Plan'}
              </strong>
            </span>
            {!ledger ? <b>{plan.currency}</b> : null}
          </div>
        </>
      )}
    </CardDetailLink>
  );
}
