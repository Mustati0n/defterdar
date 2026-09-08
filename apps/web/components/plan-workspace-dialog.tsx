'use client';

import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, type ReactNode } from 'react';
import { useModalDialog } from '@/components/ui/use-modal-dialog';
import styles from './plan-workspace-dialog.module.css';

export function PlanWorkspaceDialog({ children }: { children: ReactNode }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const close = () => router.back();
  const handleKeyDown = useModalDialog({
    open: true,
    onClose: close,
    dialogRef,
    initialFocusRef: closeRef,
  });

  return (
    <div className={styles.backdrop} role="presentation">
      <section
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-workspace-dialog-title"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <header className={styles.bar}>
          <span id="plan-workspace-dialog-title">Plan çalışma alanı</span>
          <button
            ref={closeRef}
            className={styles.close}
            type="button"
            onClick={close}
            aria-label="Plan çalışma alanını kapat"
          >
            <X />
          </button>
        </header>
        <div className={styles.content}>{children}</div>
      </section>
    </div>
  );
}
