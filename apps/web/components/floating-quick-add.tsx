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
  { kind: 'ledger', label: 'Defter oluştur', icon: BookPlus },
  { kind: 'plan', label: 'Plan oluştur', icon: NotebookTabs },
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
  return ['expense', 'income', 'ledger', 'plan'];
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
  const menuRef = useRef<HTMLDivElement>(null);
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

  function focusMenuItem(position: 'first' | 'last') {
    window.requestAnimationFrame(() => {
      const items =
        menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
      if (!items?.length) return;
      items[position === 'first' ? 0 : items.length - 1]?.focus();
    });
  }

  function handleMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!open || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key))
      return;
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );
    if (!items.length) return;
    event.preventDefault();
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === 'Home') return items[0]?.focus();
    if (event.key === 'End') return items.at(-1)?.focus();
    const direction = event.key === 'ArrowDown' ? 1 : -1;
    const nextIndex =
      currentIndex < 0
        ? direction > 0
          ? 0
          : items.length - 1
        : (currentIndex + direction + items.length) % items.length;
    items[nextIndex]?.focus();
  }

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
      onKeyDown={handleMenuKeyDown}
    >
      {open ? (
        <div
          className="floating-quick-add__menu"
          id="floating-quick-add-menu"
          ref={menuRef}
          role="menu"
          aria-label="Yeni oluştur"
        >
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
                role="menuitem"
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
        aria-label={open ? 'Oluştur menüsünü kapat' : 'Oluştur menüsünü aç'}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="floating-quick-add-menu"
        title="Oluştur"
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
          event.preventDefault();
          setOpen(true);
          focusMenuItem(event.key === 'ArrowDown' ? 'first' : 'last');
        }}
      >
        <Plus />
      </button>
    </div>
  );
}
