'use client';

import {
  BookPlus,
  CircleDollarSign,
  NotebookTabs,
  Plus,
  ReceiptText,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLedger, usePlan } from '@/features/data/hooks';
import {
  buildQuickActionHref,
  getQuickActionContext,
  type QuickActionKind,
} from '@/lib/quick-actions';

const actions: Array<{
  kind: QuickActionKind;
  label: string;
  icon: typeof ReceiptText;
}> = [
  { kind: 'expense', label: 'Harcama ekle', icon: ReceiptText },
  { kind: 'income', label: 'Gelir ekle', icon: CircleDollarSign },
  { kind: 'plan', label: 'Plan oluştur', icon: NotebookTabs },
  { kind: 'ledger', label: 'Defter oluştur', icon: BookPlus },
];

export function availableFloatingActions({
  planId,
  ledgerId,
  planActive,
  ledgerArchived,
}: {
  planId?: string;
  ledgerId?: string;
  planActive: boolean;
  ledgerArchived: boolean;
}): QuickActionKind[] {
  if (planId) return planActive ? ['expense', 'income'] : [];
  if (ledgerId)
    return ledgerArchived ? ['ledger'] : ['expense', 'income', 'plan'];
  return ['expense', 'income', 'plan', 'ledger'];
}

export function FloatingQuickAdd({
  onAction,
}: {
  onAction?: (
    kind: QuickActionKind,
    context: ReturnType<typeof getQuickActionContext>,
  ) => void;
} = {}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const suppressFocusOpenRef = useRef(false);
  const planId = pathname.match(/^\/plans\/([^/]+)/)?.[1] ?? '';
  const plan = usePlan(planId);
  const context = getQuickActionContext(
    pathname,
    plan.data?.ledgerId ?? undefined,
  );
  const ledger = useLedger(context.ledgerId ?? '');
  const visibleKinds = useMemo(
    () =>
      availableFloatingActions({
        planId: context.planId,
        ledgerId: context.ledgerId,
        planActive: plan.data?.status === 'ACTIVE',
        ledgerArchived: Boolean(ledger.data?.archivedAt),
      }),
    [
      context.ledgerId,
      context.planId,
      ledger.data?.archivedAt,
      plan.data?.status,
    ],
  );
  const visibleActions = actions.filter((action) =>
    visibleKinds.includes(action.kind),
  );

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      suppressFocusOpenRef.current = true;
      setOpen(false);
      triggerRef.current?.focus();
      window.setTimeout(() => {
        suppressFocusOpenRef.current = false;
      }, 0);
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeWithEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeWithEscape);
    };
  }, [open]);

  if (!visibleActions.length) return null;

  return (
    <div
      className={`floating-quick-add${open ? ' is-open' : ''}`}
      ref={rootRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => {
        if (!suppressFocusOpenRef.current) setOpen(true);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      {open ? (
        <div className="floating-quick-add__menu" id="floating-quick-add-menu">
          {visibleActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                href={buildQuickActionHref(action.kind, context)}
                onClick={(event) => {
                  setOpen(false);
                  if (!onAction) return;
                  event.preventDefault();
                  onAction(action.kind, context);
                }}
                key={action.kind}
                title={action.label}
              >
                <span>{action.label}</span>
                <i aria-hidden="true">
                  <Icon />
                </i>
              </Link>
            );
          })}
        </div>
      ) : null}
      <button
        className="floating-quick-add__trigger"
        type="button"
        ref={triggerRef}
        aria-label={
          open ? 'Hızlı ekle menüsünü kapat' : 'Hızlı ekle menüsünü aç'
        }
        aria-expanded={open}
        aria-controls="floating-quick-add-menu"
        onClick={() => setOpen((current) => !current)}
      >
        <Plus />
      </button>
    </div>
  );
}
