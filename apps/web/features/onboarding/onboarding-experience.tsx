'use client';

import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Check,
  HandCoins,
  NotebookTabs,
  ReceiptText,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { useLedgers } from '@/features/data/hooks';
import { useAuth } from '@/features/auth/auth-provider';
import { useOnboarding } from './use-onboarding';
import { useModalDialog } from '@/components/ui/use-modal-dialog';
import { useReducedMotion } from '@/features/motion/use-reduced-motion';
import {
  onboardingTransitionClass,
  type OnboardingDirection,
} from '@/features/motion/onboarding-transition';

export const onboardingStepNames = [
  'Defterdar',
  'Defter ve Plan',
  'İlk adım',
] as const;

function StepFrame({ children }: { children: ReactNode }) {
  return <div className="onboarding-step__body">{children}</div>;
}

export function OnboardingExperience() {
  const { user } = useAuth();
  const { pending, complete } = useOnboarding(user?.id);
  const ledgers = useLedgers(false, Boolean(pending && user));
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

  const personalLedger = ledgers.data?.find(
    (ledger) => ledger.type === 'PERSONAL',
  );

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
          {step === 0 ? (
            <StepFrame>
              <div className="welcome-copy">
                <span className="eyebrow">İlk sayfayı birlikte açalım</span>
                <h1 id="onboarding-title" ref={headingRef} tabIndex={-1}>
                  Harcamaları hatırlamaya çalışma.
                  <em> Defterdar hesabını tutsun.</em>
                </h1>
                <p>
                  Kendi hesabını izle, ortak giderleri bölüş, planlarını
                  düzenle; kimin kime ne kadar borcu kaldığını tek yerde gör.
                </p>
              </div>
              <div className="welcome-scene" aria-hidden="true">
                <span className="welcome-scene__tape" />
                <div className="welcome-scene__book">
                  <i />
                  <i />
                  <i />
                  <b>
                    Ortak
                    <br />
                    Hesap
                  </b>
                </div>
                <div className="welcome-scene__receipt">
                  <ReceiptText />
                  <strong>Market</strong>
                  <span>600 ₺</span>
                  <small>3 kişi · eşit</small>
                </div>
                <div className="welcome-scene__balance">
                  <HandCoins />
                  <span>Hesap tamam ✓</span>
                </div>
              </div>
            </StepFrame>
          ) : null}

          {step === 1 ? (
            <StepFrame>
              <div className="tour-heading">
                <span className="eyebrow">İki temel alan</span>
                <h1 id="onboarding-title" ref={headingRef} tabIndex={-1}>
                  Defter kalır, Plan tamamlanır.
                </h1>
                <p>
                  Uzun yaşayan hesabı ve içindeki geçici etkinlikleri
                  birbirinden ayır.
                </p>
              </div>
              <div className="domain-compare">
                <article className="domain-card domain-card--ledger">
                  <span className="domain-card__rings">
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                  <BookOpenText />
                  <small>UZUN SÜRELİ</small>
                  <h2>Defter</h2>
                  <p>Uzun süre birlikte tuttuğun hesabın.</p>
                  <ul>
                    <li>Ev arkadaşları</li>
                    <li>Yurt odası</li>
                    <li>Kişisel Defterim</li>
                  </ul>
                </article>
                <span className="domain-compare__link">
                  <ArrowRight />
                  <small>içinde yaşar</small>
                </span>
                <article className="domain-card domain-card--plan">
                  <span className="domain-card__pin" />
                  <NotebookTabs />
                  <small>GEÇİCİ</small>
                  <h2>Plan</h2>
                  <p>Bir Defterin içindeki etkinlik veya organizasyon.</p>
                  <ul>
                    <li>Kapadokya Gezisi</li>
                    <li>Cumartesi Pikniği</li>
                    <li>Akşam Yemeği</li>
                  </ul>
                </article>
              </div>
              <p className="domain-formula">
                <strong>Defter</strong> = uzun yaşayan alan <span>·</span>{' '}
                <strong>Plan</strong> = onun içindeki geçici iş
              </p>
            </StepFrame>
          ) : null}

          {step === 2 ? (
            <StepFrame>
              <div className="tour-heading tour-heading--center">
                <span className="eyebrow">Hazırsın</span>
                <h1 id="onboarding-title" ref={headingRef} tabIndex={-1}>
                  İlk ne yapmak istiyorsun?
                </h1>
                <p>
                  Boş bir ekrana bırakmıyoruz. Sana en anlamlı gelen ilk kaydı
                  seç.
                </p>
              </div>
              <div className="first-action-grid">
                <button
                  type="button"
                  disabled={!personalLedger}
                  onClick={() =>
                    finish(
                      personalLedger
                        ? `/ledgers/${personalLedger.id}`
                        : '/ledgers',
                    )
                  }
                >
                  <span>
                    <UserRound />
                  </span>
                  <div>
                    <strong>Kişisel Defterime git</strong>
                    <small>Gelir ve giderlerini kaydet</small>
                  </div>
                  <ArrowRight />
                </button>
                <button
                  type="button"
                  onClick={() => finish('/ledgers?create=1')}
                >
                  <span>
                    <UsersRound />
                  </span>
                  <div>
                    <strong>Yeni ortak Defter oluştur</strong>
                    <small>Düzenli ortak hesabı başlat</small>
                  </div>
                  <ArrowRight />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    finish(
                      `/plans?create=1${personalLedger ? `&ledgerId=${personalLedger.id}` : ''}`,
                    )
                  }
                >
                  <span>
                    <NotebookTabs />
                  </span>
                  <div>
                    <strong>Bir Plan oluştur</strong>
                    <small>Gezi veya etkinlik ekle</small>
                  </div>
                  <ArrowRight />
                </button>
                <button type="button" onClick={() => finish()}>
                  <span>
                    <BookOpenText />
                  </span>
                  <div>
                    <strong>Kendim keşfedeceğim</strong>
                    <small>Özete geç</small>
                  </div>
                  <ArrowRight />
                </button>
              </div>
            </StepFrame>
          ) : null}
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
