'use client';

import {
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent,
  type RefObject,
} from 'react';

const focusableSelector = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function makeBackgroundInert(dialog: HTMLElement) {
  const changed: Array<{
    element: HTMLElement;
    inert: boolean;
    ariaHidden: string | null;
  }> = [];
  let current: HTMLElement | null = dialog;

  while (current?.parentElement) {
    const parent: HTMLElement = current.parentElement;
    for (const sibling of Array.from(parent.children)) {
      if (sibling === current || !(sibling instanceof HTMLElement)) continue;
      changed.push({
        element: sibling,
        inert: sibling.inert,
        ariaHidden: sibling.getAttribute('aria-hidden'),
      });
      sibling.inert = true;
      sibling.setAttribute('aria-hidden', 'true');
    }
    current = parent;
    if (current === document.body) break;
  }

  return () => {
    for (const item of changed) {
      item.element.inert = item.inert;
      if (item.ariaHidden === null) item.element.removeAttribute('aria-hidden');
      else item.element.setAttribute('aria-hidden', item.ariaHidden);
    }
  };
}

export function useModalDialog({
  open,
  onClose,
  dialogRef,
  initialFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  dialogRef: RefObject<HTMLElement | null>;
  initialFocusRef: RefObject<HTMLElement | null>;
}) {
  const onCloseRef = useRef(onClose);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const restoreBackground = dialogRef.current
      ? makeBackgroundInert(dialogRef.current)
      : () => undefined;
    const bodyOverflow = document.body.style.overflow;
    const rootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() =>
      initialFocusRef.current?.focus(),
    );

    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = rootOverflow;
      restoreBackground();
      restoreFocusRef.current?.focus();
      restoreFocusRef.current = null;
    };
  }, [dialogRef, initialFocusRef, open]);

  return useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable =
        dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector);
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    },
    [dialogRef],
  );
}
