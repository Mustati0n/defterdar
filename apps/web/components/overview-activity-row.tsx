import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  History,
  Paperclip,
  ReceiptText,
  Undo2,
  UserRoundPlus,
  WalletCards,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import {
  activityAmount,
  activitySentence,
  activityStatus,
  formatActivityTime,
} from '@/lib/activity';
import type { ActivityItem } from '@/lib/types';

function ActivityIcon({ item }: { item: ActivityItem }) {
  if (item.action.startsWith('payment.') || item.entityType === 'Settlement')
    return <WalletCards />;
  if (item.entityType === 'Expense') return <ReceiptText />;
  if (item.entityType === 'Income') return <CircleDollarSign />;
  if (item.entityType === 'Plan') return <CalendarDays />;
  if (item.entityType === 'ExpenseAttachment') return <Paperclip />;
  if (item.entityType === 'LedgerMembership') return <UserRoundPlus />;
  return <History />;
}

function ActivityStatusIcon({
  tone,
}: {
  tone: NonNullable<ReturnType<typeof activityStatus>>['tone'];
}) {
  if (tone === 'pending') return <Clock3 />;
  if (tone === 'positive') return <CheckCircle2 />;
  if (tone === 'critical') return <XCircle />;
  return <Undo2 />;
}

function activityHref(item: ActivityItem) {
  if (item.entityType === 'Expense') return `/expenses/${item.entityId}`;
  if (item.planId) return `/plans/${item.planId}`;
  if (item.ledgerId) return `/ledgers/${item.ledgerId}`;
  if (item.entityType === 'Plan') return `/plans/${item.entityId}`;
  return null;
}

export function OverviewActivityRow({
  item,
  contextName,
  referenceTime,
}: {
  item: ActivityItem;
  contextName?: string;
  referenceTime: number;
}) {
  const status = activityStatus(item);
  const amount = activityAmount(item);
  const href = activityHref(item);
  const content = (
    <>
      <span className="overview-activity__icon" aria-hidden="true">
        <ActivityIcon item={item} />
      </span>
      <span className="overview-activity__body">
        <strong>{item.actor?.displayName ?? 'Defterdar'}</strong>
        <span className="overview-activity__event">
          {contextName ? (
            <>
              <b>{contextName}</b> ·{' '}
            </>
          ) : null}
          {activitySentence(item)}
        </span>
        <time dateTime={item.createdAt}>
          {formatActivityTime(item.createdAt, referenceTime)}
        </time>
      </span>
      <span className="overview-activity__aside">
        {amount ? <strong>{amount}</strong> : null}
        {status ? (
          <span
            className={`overview-activity__status overview-activity__status--${status.tone}`}
          >
            <ActivityStatusIcon tone={status.tone} /> {status.label}
          </span>
        ) : null}
        {href ? <ArrowRight aria-hidden="true" /> : null}
      </span>
    </>
  );

  return href ? (
    <Link className="overview-activity" href={href}>
      {content}
    </Link>
  ) : (
    <div className="overview-activity">{content}</div>
  );
}
