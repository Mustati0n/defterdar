'use client';

import { BookOpenText, Info, RotateCcw, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PageHeading } from '@/components/page-heading';
import { useAuth } from '@/features/auth/auth-provider';
import { useOnboarding } from '@/features/onboarding/use-onboarding';
import { CategoryManager } from '@/features/settings/category-manager';
import { ProfileForm } from '@/features/settings/profile-form';

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { replay } = useOnboarding(user?.id);

  return (
    <>
      <PageHeading
        eyebrow="Defter sahibi"
        title="Ayarlar"
        description="Profilini, Defter kategorilerini ve ürün deneyimini tek yerden düzenle."
      />
      <div className="settings-hub">
        <ProfileForm />
        <CategoryManager />
        <section
          className="paper-section experience-settings"
          aria-labelledby="experience-heading"
        >
          <span className="eyebrow">
            <Sparkles /> Deneyim
          </span>
          <h2 id="experience-heading">Tanıtım turu</h2>
          <div className="experience-settings__row">
            <span>
              <RotateCcw />
            </span>
            <div>
              <strong>Tanıtımı tekrar göster</strong>
              <p>Defter, Plan, Ismarla ve bakiye turunu baştan aç.</p>
            </div>
            <button
              className="button button--quiet button--small"
              type="button"
              onClick={() => {
                replay();
                router.push('/overview');
              }}
            >
              Tekrar başlat
            </button>
          </div>
        </section>
        <section
          className="paper-section about-settings"
          aria-labelledby="about-heading"
        >
          <span className="eyebrow">
            <Info /> Defterdar hakkında
          </span>
          <h2 id="about-heading">Hesabın akılda kalmasın.</h2>
          <p>
            <BookOpenText /> Defterdar, kişisel ve ortak harcamaları sakin,
            anlaşılır bir Defter düzeninde tutar.
          </p>
        </section>
      </div>
    </>
  );
}
