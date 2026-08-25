'use client';

import {
  BookPlus,
  ChevronDown,
  CircleDollarSign,
  NotebookPen,
  NotebookTabs,
  Plus,
  ReceiptText,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useLedger, usePlan } from '@/features/data/hooks';
import {
  buildQuickActionHref,
  getQuickActionContext,
  type QuickActionKind,
} from '@/lib/quick-actions';

const actions: Array<{
  kind: QuickActionKind;
  label: string;
  help: string;
  icon: typeof ReceiptText;
}> = [
  {
    kind: 'expense',
    label: 'Harcama ekle',
    help: 'Giderini kaydet',
    icon: ReceiptText,
  },
  {
    kind: 'income',
    label: 'Gelir ekle',
    help: 'Nakit akışını kaydet',
    icon: CircleDollarSign,
  },
  {
    kind: 'plan',
    label: 'Plan oluştur',
    help: 'Etkinlik veya gezi ekle',
    icon: NotebookTabs,
  },
  {
    kind: 'ledger',
    label: 'Defter oluştur',
    help: 'Yeni kayıt alanı aç',
    icon: BookPlus,
  },
];

export function QuickAdd() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ledgerPathId = pathname.match(/^\/ledgers\/([^/]+)/)?.[1] ?? '';
  const planId = pathname.match(/^\/plans\/([^/]+)/)?.[1] ?? '';
  const plan = usePlan(planId);
  const context = getQuickActionContext(
    pathname,
    plan.data?.ledgerId ?? undefined,
  );
  const ledger = useLedger(context.ledgerId ?? ledgerPathId);
  const financialEntryLocked = Boolean(
    (planId && plan.data?.status !== 'ACTIVE') || ledger.data?.archivedAt,
  );
  const availableActions = financialEntryLocked
    ? actions.filter((action) =>
        ledger.data?.archivedAt
          ? action.kind === 'ledger'
          : action.kind === 'plan' || action.kind === 'ledger',
      )
    : actions;
  const contextualActions = availableActions.map((action) =>
    ledger.data?.type === 'PERSONAL' && action.kind === 'expense'
      ? { ...action, help: 'Kişisel giderini kaydet' }
      : action,
  );
  const contextLabel = context.planId
    ? 'Bu Plan için'
    : context.ledgerId
      ? 'Bu Defter için'
      : 'Hızlı ekle';

  return (
    <div className={`quick-add${open ? ' quick-add--open' : ''}`}>
      <button
        className="quick-add__trigger"
        type="button"
        aria-expanded={open}
        aria-controls="quick-add-menu"
        onClick={() => setOpen((current) => !current)}
      >
        <span>
          <Plus />
        </span>
        <span>
          <strong>{contextLabel}</strong>
          <small>Yeni kayıt</small>
        </span>
        <ChevronDown />
      </button>
      {open ? (
        <div className="quick-add__menu" id="quick-add-menu">
          <span className="quick-add__caption">
            <NotebookPen /> Ne eklemek istersin?
          </span>
          {contextualActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                href={buildQuickActionHref(action.kind, context)}
                onClick={() => setOpen(false)}
                key={action.kind}
              >
                <span>
                  <Icon />
                </span>
                <span>
                  <strong>{action.label}</strong>
                  <small>{action.help}</small>
                </span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
