'use client';

import { ArrowLeft, ArrowRight, Lightbulb, X } from 'lucide-react';
import { useRef } from 'react';
import { useModalDialog } from '@/components/ui/use-modal-dialog';
import { useAuth } from '@/features/auth/auth-provider';
import { useOnboarding } from '@/features/onboarding/use-onboarding';
import { useInterfacePreferences } from '@/features/preferences/use-interface-preferences';
import type { PageIntroKey } from '@/lib/page-intros';
import { usePageIntro } from './use-page-intro';

export function PageIntro({
  pageKey,
  title,
  steps,
}: {
  pageKey: PageIntroKey;
  title: string;
  steps: readonly string[];
}) {
  const { user } = useAuth();
  const { pending: onboardingPending } = useOnboarding(user?.id);
  const { preferences } = useInterfacePreferences(user?.id);
  const { state, goTo, complete } = usePageIntro(user?.id, pageKey);
  const dialogRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const open = Boolean(
    user &&
    preferences.pageIntros &&
    !onboardingPending &&
    !state.complete &&
    steps.length,
  );
  const current = Math.min(state.step, Math.max(steps.length - 1, 0));
  const handleKeyDown = useModalDialog({
    open,
    onClose: complete,
    dialogRef,
    initialFocusRef: headingRef,
  });

  if (!open) return null;

  return (
    <div className="page-intro-backdrop">
      <div
        className="page-intro-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`page-intro-${pageKey}`}
        ref={dialogRef}
        onKeyDown={handleKeyDown}
      >
        <button
          className="page-intro-card__close"
          type="button"
          aria-label="Sayfa tanıtımını kapat"
          onClick={complete}
        >
          <X />
        </button>
        <span className="page-intro-card__icon" aria-hidden="true">
          <Lightbulb />
        </span>
        <span className="eyebrow">Kısa sayfa rehberi</span>
        <h2 id={`page-intro-${pageKey}`} tabIndex={-1} ref={headingRef}>
          {title}
        </h2>
        <p>{steps[current]}</p>
        <div className="page-intro-card__progress" aria-live="polite">
          {current + 1} / {steps.length}
        </div>
        <footer>
          <button
            className="button button--quiet"
            type="button"
            disabled={current === 0}
            onClick={() => goTo(current - 1)}
          >
            <ArrowLeft /> Geri
          </button>
          <button
            className="button button--quiet"
            type="button"
            onClick={complete}
          >
            Atla
          </button>
          {current < steps.length - 1 ? (
            <button
              className="button button--primary"
              type="button"
              onClick={() => goTo(current + 1)}
            >
              İleri <ArrowRight />
            </button>
          ) : (
            <button
              className="button button--primary"
              type="button"
              onClick={complete}
            >
              Anladım
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
