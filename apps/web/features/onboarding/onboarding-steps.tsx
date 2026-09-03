import {
  ArrowRight,
  BookOpenText,
  HandCoins,
  NotebookTabs,
  ReceiptText,
  UsersRound,
} from 'lucide-react';
import type { RefObject, ReactNode } from 'react';

function StepFrame({ children }: { children: ReactNode }) {
  return <div className="onboarding-step__body">{children}</div>;
}

interface OnboardingStepContentProps {
  step: number;
  headingRef: RefObject<HTMLHeadingElement | null>;
  finish: (path?: string) => void;
}

export function OnboardingStepContent({
  step,
  headingRef,
  finish,
}: OnboardingStepContentProps) {
  if (step === 0) {
    return (
      <StepFrame>
        <div className="welcome-copy">
          <span className="eyebrow">İlk sayfayı birlikte açalım</span>
          <h1 id="onboarding-title" ref={headingRef} tabIndex={-1}>
            Harcamaları hatırlamaya çalışma.
            <em> Defterdar hesabını tutsun.</em>
          </h1>
          <p>
            Kendi hesabını izle, ortak giderleri bölüş, planlarını düzenle;
            kimin kime ne kadar borcu kaldığını tek yerde gör.
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
    );
  }

  if (step === 1) {
    return (
      <StepFrame>
        <div className="tour-heading">
          <span className="eyebrow">İki esnek alan</span>
          <h1 id="onboarding-title" ref={headingRef} tabIndex={-1}>
            Defter kalır, Plan bir Deftere eklenmeden de başlayabilir.
          </h1>
          <p>
            Uzun yaşayan hesabı ve geçici etkinlikleri ihtiyacına göre ayır.
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
              <li>Ev bütçesi</li>
            </ul>
          </article>
          <span className="domain-compare__link">
            <ArrowRight />
            <small>isterse bağlanır</small>
          </span>
          <article className="domain-card domain-card--plan">
            <span className="domain-card__pin" />
            <NotebookTabs />
            <small>GEÇİCİ</small>
            <h2>Plan</h2>
            <p>
              İster tek başına, ister bir Deftere ekleyerek etkinlik planla.
            </p>
            <ul>
              <li>Kapadokya Gezisi</li>
              <li>Cumartesi Pikniği</li>
              <li>Akşam Yemeği</li>
            </ul>
          </article>
        </div>
        <p className="domain-formula">
          <strong>Defter</strong> = uzun yaşayan alan <span>·</span>{' '}
          <strong>Plan</strong> = tek başına ya da bir Deftere ekli geçici iş
        </p>
      </StepFrame>
    );
  }

  return (
    <StepFrame>
      <div className="tour-heading tour-heading--center">
        <span className="eyebrow">Hazırsın</span>
        <h1 id="onboarding-title" ref={headingRef} tabIndex={-1}>
          İlk ne yapmak istiyorsun?
        </h1>
        <p>Boş bir ekrana bırakmıyoruz. Sana en anlamlı gelen ilk kaydı seç.</p>
      </div>
      <div className="first-action-grid">
        <button type="button" onClick={() => finish('/ledgers?create=1')}>
          <span>
            <UsersRound />
          </span>
          <div>
            <strong>Defter oluştur</strong>
            <small>Düzenli bir hesap aç, istersen birlikte tut</small>
          </div>
          <ArrowRight />
        </button>
        <button
          type="button"
          onClick={() => finish('/plans?create=1&standalone=1')}
        >
          <span>
            <NotebookTabs />
          </span>
          <div>
            <strong>Plan oluştur</strong>
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
            <small>Genel Bakış&apos;a geç</small>
          </div>
          <ArrowRight />
        </button>
      </div>
    </StepFrame>
  );
}
