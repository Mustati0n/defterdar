'use client';

import { ArrowLeft, ArrowRight, BookOpenText, Check, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useAuth } from '@/features/auth/auth-provider';
import { useOnboarding } from './use-onboarding';
import { useModalDialog } from '@/components/ui/use-modal-dialog';
import { useReducedMotion } from '@/features/motion/use-reduced-motion';
import {
  onboardingTransitionClass,
  type OnboardingDirection,
} from '@/features/motion/onboarding-transition';
import { OnboardingStepContent } from './onboarding-steps';

export const onboardingStepNames = [
  'Defterdar',
  'Defter ve Plan',
  'İlk adım',
] as const;

export function OnboardingExperience() {
  const { user } = useAuth();
  const { pending, complete } = useOnboarding(user?.id);
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<OnboardingDirection>(1);
  const [phase, setPhase] = useState<'idle' | 'exit' | 'enter'>('idle');
  const reducedMotion = useReducedMotion();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const transitionTimers = useRef<number[]>([]);
  const handleDialogKeyDown = useModalDialog({
    open: Boolean(pending && user),
    onClose: complete,
    dialogRef,
    initialFocusRef: headingRef,
  });

  useEffect(() => {
    if (pending) headingRef.current?.focus();
  }, [pending, step]);

  useEffect(
    () => () => transitionTimers.current.forEach(window.clearTimeout),
    [],
  );

  if (!pending || !user) return null;

  function finish(path = '/overview') {
    complete();
    router.push(path);
  }

  function moveTo(nextStep: number, nextDirection: OnboardingDirection) {
    if (phase !== 'idle' || nextStep === step) return;
    setDirection(nextDirection);
    if (reducedMotion) {
      setStep(nextStep);
      return;
    }

    setPhase('exit');
    transitionTimers.current.push(
      window.setTimeout(() => {
        setStep(nextStep);
        setPhase('enter');
        transitionTimers.current.push(
          window.setTimeout(() => setPhase('idle'), 220),
        );
      }, 150),
    );
  }

  return (
    <div
      className="onboarding-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      ref={dialogRef}
      onKeyDown={handleDialogKeyDown}
    >
      <div className="onboarding-shell">
        <header className="onboarding-header">
          <span className="onboarding-brand">
            <BookOpenText /> <strong>Defterdar</strong>
          </span>
          <button
            className="onboarding-skip"
            type="button"
            onClick={() => complete()}
          >
            Tanıtımı atla <X />
          </button>
        </header>

        <div
          className="onboarding-progress"
          style={
            {
              '--onboarding-progress': step / (onboardingStepNames.length - 1),
            } as CSSProperties
          }
        >
          <p aria-live="polite" key={step}>
            <strong>
              {step + 1} / {onboardingStepNames.length}
            </strong>
            <span>{onboardingStepNames[step]}</span>
          </p>
          <ol aria-label="Tanıtım ilerlemesi">
            {onboardingStepNames.map((name, index) => (
              <li
                className={
                  index < step
                    ? 'is-complete'
                    : index === step
                      ? 'is-current'
                      : ''
                }
                aria-current={index === step ? 'step' : undefined}
                key={name}
              >
                <span>{index < step ? <Check /> : index + 1}</span>
              </li>
            ))}
          </ol>
        </div>

        <section
          className={`onboarding-step onboarding-step--${step} ${onboardingTransitionClass(direction, phase)}`}
          data-direction={direction === 1 ? 'forward' : 'backward'}
          aria-busy={phase !== 'idle'}
          inert={phase === 'exit' || undefined}
        >
          <OnboardingStepContent
            step={step}
            headingRef={headingRef}
            finish={finish}
          />
        </section>

        <footer className="onboarding-footer">
          <button
            className="button button--quiet"
            type="button"
            disabled={step === 0 || phase !== 'idle'}
            onClick={() => moveTo(Math.max(0, step - 1), -1)}
          >
            <ArrowLeft /> Geri
          </button>
          {step < onboardingStepNames.length - 1 ? (
            <button
              className="button button--primary"
              type="button"
              disabled={phase !== 'idle'}
              onClick={() =>
                moveTo(Math.min(onboardingStepNames.length - 1, step + 1), 1)
              }
            >
              İleri <ArrowRight />
            </button>
          ) : null}
        </footer>
      </div>
    </div>
  );
}
