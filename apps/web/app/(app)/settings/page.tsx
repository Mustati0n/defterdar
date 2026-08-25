'use client';

import { RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PageHeading } from '@/components/page-heading';
import { useAuth } from '@/features/auth/auth-provider';
import { useOnboarding } from '@/features/onboarding/use-onboarding';
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
        description="Profil bilgilerini ve ürün yardım seçeneklerini düzenle. Defter kategorileri ilgili Defterin Ayarlar bölümündedir."
        variant="static"
      />
      <div className="settings-hub">
        <ProfileForm />
        <section
          className="paper-section experience-settings"
          aria-labelledby="experience-heading"
        >
          <span className="eyebrow">Yardım</span>
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
      </div>
    </>
  );
}
