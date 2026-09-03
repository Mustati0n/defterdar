'use client';

import { CircleDollarSign, ReceiptText, X } from 'lucide-react';
import { useRef } from 'react';
import { useModalDialog } from '@/components/ui/use-modal-dialog';
import { useLedgers } from '@/features/data/hooks';
import { LazyRouteForm } from '@/features/forms/lazy-route-form';
import { CreateLedgerDialog } from '@/features/ledgers/create-ledger-dialog';
import { CreatePlanDialog } from '@/features/plans/create-plan-dialog';
import type { QuickActionContext, QuickActionKind } from '@/lib/quick-actions';

export interface QuickActionSelection {
  kind: QuickActionKind;
  context: QuickActionContext;
}

export function QuickActionDialog({
  action,
  onClose,
}: {
  action: QuickActionSelection | null;
  onClose: () => void;
}) {
  if (!action) return null;
  if (action.kind === 'ledger') {
    return (
      <CreateLedgerDialog
        open
        hideTrigger
        onOpenChange={(open) => !open && onClose()}
      />
    );
  }
  if (action.kind === 'plan') {
    return <PlanQuickActionDialog action={action} onClose={onClose} />;
  }
  return <FinancialQuickActionDialog action={action} onClose={onClose} />;
}

function PlanQuickActionDialog({
  action,
  onClose,
}: {
  action: QuickActionSelection;
  onClose: () => void;
}) {
  const ledgers = useLedgers();
  return (
    <CreatePlanDialog
      ledgers={ledgers.data ?? []}
      initialLedgerId={action.context.ledgerId}
      open
      hideTrigger
      onOpenChange={(open) => !open && onClose()}
    />
  );
}

function FinancialQuickActionDialog({
  action,
  onClose,
}: {
  action: QuickActionSelection;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const initialFocusRef = useRef<HTMLElement>(null);
  const handleKeyDown = useModalDialog({
    open: true,
    onClose,
    dialogRef,
    initialFocusRef,
  });
  const kind = action.kind === 'income' ? 'income' : 'expense';
  const expense = kind === 'expense';
  const Icon = expense ? ReceiptText : CircleDollarSign;
  const title = expense ? 'Harcama ekle' : 'Gelir ekle';

  return (
    <div
      className="dialog-backdrop quick-action-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        ref={(element) => {
          dialogRef.current = element;
          initialFocusRef.current = element;
        }}
        className="dialog-card quick-action-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-action-dialog-title"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <button
          className="dialog-card__close"
          type="button"
          onClick={onClose}
          aria-label="Pencereyi kapat"
        >
          <X />
        </button>
        <header className="quick-action-dialog__header">
          <span aria-hidden="true">
            <Icon />
          </span>
          <div>
            <small>Hızlı işlem</small>
            <h2 id="quick-action-dialog-title">{title}</h2>
          </div>
        </header>
        <LazyRouteForm
          kind={kind}
          initialLedgerId={action.context.ledgerId}
          initialPlanId={action.context.planId}
          onCancel={onClose}
          onComplete={onClose}
          presentation="dialog"
        />
      </section>
    </div>
  );
}
