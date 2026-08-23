'use client';

import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Check,
  CircleDollarSign,
  HandCoins,
  Home,
  NotebookTabs,
  PartyPopper,
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
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useLedgers } from '@/features/data/hooks';
import { useAuth } from '@/features/auth/auth-provider';
import {
  saveOnboardingScenario,
  type OnboardingScenario,
} from '@/lib/onboarding';
import { useOnboarding } from './use-onboarding';

const stepNames = [
  'Hoş geldin',
  'Sana uygun kullanım',
  'Defter ve Plan',
  'Harcama paylaşımı',
  'Borç ve bakiye',
  'İlk adım',
] as const;

const scenarios: Array<{
  id: OnboardingScenario;
  icon: typeof UserRound;
  title: string;
  description: string;
  items: string[];
}> = [
  {
    id: 'personal',
    icon: UserRound,
    title: 'Kendi hesabımı tutuyorum',
    description: 'Gelir ve giderlerimi tek yerde görmek istiyorum.',
    items: ['Kişisel harcamalar', 'Kategoriler', 'Aylık özetler'],
  },
  {
    id: 'home',
    icon: Home,
    title: 'Ev arkadaşlarımla kullanıyorum',
    description: 'Ortak giderlerde kimin ne ödediği karışmasın.',
    items: ['Kira ve faturalar', 'Market', 'Kim ne ödedi'],
  },
  {
    id: 'plans',
    icon: PartyPopper,
    title: 'Arkadaşlarımla plan yapıyorum',
    description: 'Kısa etkinliklerin hesabını kolayca kapatmak istiyorum.',
    items: ['Gezi ve tatil', 'Yemek', 'Piknik ve etkinlik'],
  },
];

function StepFrame({ children }: { children: ReactNode }) {
  return <div className="onboarding-step__body">{children}</div>;
}

export function OnboardingExperience() {
  const { user } = useAuth();
  const { pending, complete } = useOnboarding(user?.id);
  const ledgers = useLedgers();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [scenario, setScenario] = useState<OnboardingScenario>('personal');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pending) headingRef.current?.focus();
  }, [pending, step]);

  if (!pending || !user) return null;

  const personalLedger = ledgers.data?.find(
    (ledger) => ledger.type === 'PERSONAL',
  );

  function chooseScenario(value: OnboardingScenario) {
    setScenario(value);
    saveOnboardingScenario(user!.id, value);
  }

  function finish(path = '/overview') {
    complete();
    router.push(path);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      complete();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    );
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
  }

  return (
    <div
      className="onboarding-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      ref={dialogRef}
      onKeyDown={handleKeyDown}
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

        <div className="onboarding-progress">
          <p aria-live="polite">
            <strong>
              {step + 1} / {stepNames.length}
            </strong>
            <span>{stepNames[step]}</span>
          </p>
          <ol aria-label="Tanıtım ilerlemesi">
            {stepNames.map((name, index) => (
              <li
                className={index <= step ? 'is-complete' : ''}
                aria-current={index === step ? 'step' : undefined}
                key={name}
              >
                <span>{index < step ? <Check /> : index + 1}</span>
              </li>
            ))}
          </ol>
        </div>

        <section className={`onboarding-step onboarding-step--${step}`}>
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
                <span className="eyebrow">Sana en yakın olan</span>
                <h1 id="onboarding-title" ref={headingRef} tabIndex={-1}>
                  Defterdar&apos;ı ne için kullanacaksın?
                </h1>
                <p>
                  Seçimin sadece tanıtımı sana göre düzenler; sonra her şeyi
                  kullanabilirsin.
                </p>
              </div>
              <div className="scenario-grid">
                {scenarios.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      className={`scenario-card${scenario === item.id ? ' is-selected' : ''}`}
                      type="button"
                      aria-pressed={scenario === item.id}
                      onClick={() => chooseScenario(item.id)}
                      key={item.id}
                    >
                      <span>
                        <Icon />
                      </span>
                      <h2>{item.title}</h2>
                      <p>{item.description}</p>
                      <ul>
                        {item.items.map((label) => (
                          <li key={label}>
                            <Check /> {label}
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>
            </StepFrame>
          ) : null}

          {step === 2 ? (
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

          {step === 3 ? (
            <StepFrame>
              <div className="tour-heading">
                <span className="eyebrow">Paylaşmak bu kadar</span>
                <h1 id="onboarding-title" ref={headingRef} tabIndex={-1}>
                  Kim ödedi, kimler paylaşıyor?
                </h1>
                <p>Sen sadece gerçeği yaz; payları Defterdar hesaplasın.</p>
              </div>
              <div className="expense-demo">
                <div className="expense-demo__receipt">
                  <ReceiptText />
                  <small>AKŞAM YEMEĞİ</small>
                  <strong>600 ₺</strong>
                  <span>Mustafa ödedi</span>
                </div>
                <ArrowRight className="expense-demo__arrow" />
                <div className="expense-demo__people">
                  <span>
                    <UserRound /> Mustafa <b>200 ₺</b>
                  </span>
                  <span>
                    <UserRound /> Ece <b>200 ₺</b>
                  </span>
                  <span>
                    <UserRound /> Can <b>200 ₺</b>
                  </span>
                </div>
              </div>
              <div className="plain-language-note">
                <CircleDollarSign />
                <p>
                  <strong>3 kişi eşit paylaştı.</strong> Kişi başı 200 ₺.
                  Mustafa kendi payı dışında 400 ₺ alacaklı olur.
                </p>
              </div>
            </StepFrame>
          ) : null}

          {step === 4 ? (
            <StepFrame>
              <div className="tour-heading">
                <span className="eyebrow">İki pratik kısayol</span>
                <h1 id="onboarding-title" ref={headingRef} tabIndex={-1}>
                  Borç büyütmek zorunda değil.
                </h1>
                <p>
                  Defterdar günlük hayattaki anlaşmaları insan diliyle uygular.
                </p>
              </div>
              <div className="money-concepts">
                <article className="gift-note">
                  <HandCoins />
                  <div>
                    <small>ISMARLA</small>
                    <h2>“Bu benden.”</h2>
                    <p>
                      Ismarla&apos;yı seçersen diğer kişiler için geri ödeme
                      borcu oluşmaz.
                    </p>
                  </div>
                </article>
                <article className="offset-note">
                  <span className="offset-note__before">
                    <small>Ahmet&apos;e borcun</small>
                    <strong>−300 ₺</strong>
                  </span>
                  <ArrowRight />
                  <span className="offset-note__share">
                    <small>Ahmet&apos;in yeni payı</small>
                    <strong>100 ₺</strong>
                  </span>
                  <ArrowRight />
                  <span className="offset-note__after">
                    <small>Borçtan düş</small>
                    <strong>−200 ₺</strong>
                  </span>
                  <p>Yeni ödeme istemek yerine mevcut borcun azalır.</p>
                </article>
              </div>
              <div className="balance-legend">
                <span className="balance-positive">
                  <b>+250 ₺</b>
                  <small>Alacağın var ↑</small>
                </span>
                <span className="balance-negative">
                  <b>−180 ₺</b>
                  <small>Ödemen var ↓</small>
                </span>
                <span className="balance-zero">
                  <b>0 ₺</b>
                  <small>Hesabınız kapalı ✓</small>
                </span>
              </div>
            </StepFrame>
          ) : null}

          {step === 5 ? (
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
                    <small>Çalışma masasına geç</small>
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
            disabled={step === 0}
            onClick={() => setStep((current) => Math.max(0, current - 1))}
          >
            <ArrowLeft /> Geri
          </button>
          {step < stepNames.length - 1 ? (
            <button
              className="button button--primary"
              type="button"
              onClick={() =>
                setStep((current) =>
                  Math.min(stepNames.length - 1, current + 1),
                )
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
