'use client';

import { Bell, KeyRound, Palette, UserRound } from 'lucide-react';
import { PageHeading } from '@/components/page-heading';
import { useAuth } from '@/features/auth/auth-provider';
import { initials } from '@/lib/format';

export default function SettingsPage() {
  const { user } = useAuth();
  return (
    <>
      <PageHeading
        eyebrow="Defter sahibi"
        title="Ayarlar"
        description="Profil, oturum ve görünüm tercihleri için temel çalışma alanı."
      />
      <div className="settings-grid">
        <section className="paper-section profile-card">
          <span className="avatar avatar--large">
            {initials(user?.displayName ?? 'D')}
          </span>
          <div>
            <span className="eyebrow">Profil</span>
            <h2>{user?.displayName}</h2>
            <p>{user?.email}</p>
          </div>
        </section>
        <section className="settings-list">
          <article>
            <span>
              <UserRound />
            </span>
            <div>
              <strong>Profil bilgileri</strong>
              <p>Görünen ad ve hesap bilgileri.</p>
            </div>
            <small>API hazır</small>
          </article>
          <article>
            <span>
              <KeyRound />
            </span>
            <div>
              <strong>Oturum güvenliği</strong>
              <p>Dönen yenileme tokenı ile kalıcı oturum.</p>
            </div>
            <small>Etkin</small>
          </article>
          <article>
            <span>
              <Bell />
            </span>
            <div>
              <strong>Bildirimler</strong>
              <p>Davet ve hareket bildirimleri için hazır alan.</p>
            </div>
            <small>Yakında</small>
          </article>
          <article>
            <span>
              <Palette />
            </span>
            <div>
              <strong>Görünüm</strong>
              <p>Sıcak kâğıt teması ve erişilebilir kontrast.</p>
            </div>
            <small>Varsayılan</small>
          </article>
        </section>
      </div>
    </>
  );
}
