import {
  ArrowDownLeft,
  ArrowUpRight,
  BellRing,
  CheckCircle2,
  CircleDollarSign,
  ReceiptText,
} from 'lucide-react';
import Link from 'next/link';
import { useId } from 'react';
import type { ReactNode } from 'react';
import type { FinancialPositionState } from './financial-ux';
import { formatMoneyFromMinor } from '@/lib/format';

export interface FinancialPositionItem {
  id: string;
  label: string;
  amountMinor: number | string;
}

interface FinancialPositionAction {
  href: string;
  label: string;
  icon?: ReactNode;
}

export interface FinancialPositionProps {
  state: FinancialPositionState;
  currency: string;
  amountMinor?: number | string;
  items?: FinancialPositionItem[];
  pendingCount?: number;
  description?: string;
  action?: FinancialPositionAction;
  label?: string;
}

const stateContent: Record<
  FinancialPositionState,
  { title: string; description: string; icon: ReactNode }
> = {
  DEBTOR: {
    title: 'Borcun var',
    description: 'Hesabı kapatmak için yapman gereken net ödemeler.',
    icon: <ArrowUpRight />,
  },
  CREDITOR: {
    title: 'Alacağın var',
    description: 'Sana yapılması gereken ödemelerin net toplamı.',
    icon: <ArrowDownLeft />,
  },
  SETTLED: {
    title: 'Hesabın kapalı',
    description: 'Yapman gereken veya alacağın bir ödeme kalmadı.',
    icon: <CheckCircle2 />,
  },
  NO_ACTIVITY: {
    title: 'Henüz hesap oluşmadı',
    description: 'Bu alanda henüz ortak finansal hareket bulunmuyor.',
    icon: <ReceiptText />,
  },
  PENDING_APPROVAL: {
    title: 'Onayın gerekiyor',
    description: 'Onaylanırsa hesabına yansıyacak toplam tutar.',
    icon: <BellRing />,
  },
};

export function FinancialPosition({
  state,
  currency,
  amountMinor,
  items = [],
  pendingCount = 0,
  description,
  action,
  label = 'Senin hesabın',
}: FinancialPositionProps) {
  const titleId = useId();
  const descriptionId = useId();
  const content = stateContent[state];
  const showsAmount =
    amountMinor !== undefined &&
    (state === 'DEBTOR' ||
      state === 'CREDITOR' ||
      state === 'PENDING_APPROVAL');
  const absoluteAmount =
    typeof amountMinor === 'string'
      ? (() => {
          const value = BigInt(amountMinor);
          return (value < 0n ? -value : value).toString();
        })()
      : Math.abs(amountMinor ?? 0);

  return (
    <section
      className={`financial-position financial-position--${state.toLowerCase().replace('_', '-')}`}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <span className="financial-position__icon" aria-hidden="true">
        {content.icon}
      </span>
      <div className="financial-position__content">
        <span className="type-detail-label">{label}</span>
        <h2 id={titleId}>{content.title}</h2>
        {showsAmount ? (
          <strong className="financial-number financial-number--title">
            {formatMoneyFromMinor(absoluteAmount, currency)}
          </strong>
        ) : state === 'SETTLED' ? (
          <strong className="financial-position__completion">Tamamlandı</strong>
        ) : null}
        <p id={descriptionId}>{description ?? content.description}</p>
        {state === 'PENDING_APPROVAL' && pendingCount > 0 ? (
          <p className="financial-position__pending-count">
            {pendingCount} yeni hareket senden onay bekliyor.
          </p>
        ) : null}
        {items.length ? (
          <ul className="financial-position__items" aria-label="Ödeme yönleri">
            {items.map((item) => (
              <li key={item.id}>
                <span>{item.label}</span>
                <strong data-financial-number>
                  {formatMoneyFromMinor(item.amountMinor, currency)}
                </strong>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {action ? (
        <Link className="button button--paper" href={action.href}>
          <span aria-hidden="true">
            {action.icon ?? <CircleDollarSign />}
          </span>
          {action.label}
        </Link>
      ) : null}
    </section>
  );
}
