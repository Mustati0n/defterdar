'use client';

import {
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';

export function AnchoredMenu({
  anchorRef,
  open,
  children,
  className,
  onDismiss,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  children: ReactNode;
  className?: string;
  onDismiss: () => void;
}) {
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      const menuWidth = Math.min(270, window.innerWidth - 32);
      setPosition({
        top: rect.bottom + 9,
        left: Math.max(
          16,
          Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 16),
        ),
        width: menuWidth,
      });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [anchorRef, open]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onDismiss();
      anchorRef.current?.focus();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [anchorRef, onDismiss, open]);

  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div
      className={className}
      data-anchored-menu
      style={{ top: position.top, left: position.left, width: position.width }}
    >
      {children}
    </div>,
    document.body,
  );
}
