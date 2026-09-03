'use client';

import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/features/auth/auth-provider';
import { useToast } from '@/components/ui/toast';
import { useInterfacePreferences } from './use-interface-preferences';
import {
  pageIntroKeys,
  resetAllPageIntros,
  resetPageIntro,
  type PageIntroKey,
} from '@/lib/page-intros';

const introLabels: Record<PageIntroKey, string> = {
  ledgers: 'Defterler',
  plans: 'Planlar',
  analytics: 'İstatistikler',
  balances: 'Bakiyeler',
};

export function InterfacePreferencesPanel() {
  const { user } = useAuth();
  const toast = useToast();
  const { preferences, update, reset } = useInterfacePreferences(user?.id);
  const [introKey, setIntroKey] = useState<PageIntroKey>('ledgers');

  return (
    <section
      className="paper-section interface-preferences"
      aria-labelledby="interface-heading"
    >
      <span className="eyebrow">
        <SlidersHorizontal /> Arayüz
      </span>
      <h2 id="interface-heading">Görünüm tercihleri</h2>

      <fieldset>
        <legend>Arayüz yoğunluğu</legend>
        <div className="segmented-control">
          {(['comfortable', 'compact'] as const).map((density) => (
            <button
              type="button"
              className={preferences.density === density ? 'is-active' : ''}
              aria-pressed={preferences.density === density}
              onClick={() => update({ density })}
              key={density}
            >
              {density === 'comfortable' ? 'Rahat' : 'Kompakt'}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="field">
        <span>Hareket</span>
        <select
          className="input"
          value={preferences.motion}
          onChange={(event) =>
            update({
              motion: event.target.value as 'system' | 'standard' | 'reduced',
            })
          }
        >
          <option value="system">Sistem</option>
          <option value="standard">Standart</option>
          <option value="reduced">Azaltılmış</option>
        </select>
      </label>

      <fieldset>
        <legend>Genel Bakış bölümleri</legend>
        <div className="preference-checks">
          {(
            [
              ['ledgers', 'Aktif Defterler'],
              ['plans', 'Aktif Planlar'],
              ['activity', 'Son hareketler'],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={preferences.overview[key]}
                onChange={(event) =>
                  update({
                    overview: {
                      ...preferences.overview,
                      [key]: event.target.checked,
                    },
                  })
                }
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="preference-toggle">
        <span>
          <strong>Otomatik kompakt başlık</strong>
          <small>
            Uzun sayfalarda başlığı kaydırırken çalışma barına dönüştürür.
          </small>
        </span>
        <input
          type="checkbox"
          checked={preferences.adaptiveHeader}
          onChange={(event) => update({ adaptiveHeader: event.target.checked })}
        />
      </label>

      <label className="preference-toggle">
        <span>
          <strong>Sayfa tanıtımları</strong>
          <small>Bir sayfayı ilk kez açtığında kısa rehberi gösterir.</small>
        </span>
        <input
          type="checkbox"
          checked={preferences.pageIntros}
          onChange={(event) => update({ pageIntros: event.target.checked })}
        />
      </label>

      <div className="page-intro-reset">
        <label className="field">
          <span>Belirli tanıtım</span>
          <select
            className="input"
            value={introKey}
            onChange={(event) =>
              setIntroKey(event.target.value as PageIntroKey)
            }
          >
            {pageIntroKeys.map((key) => (
              <option value={key} key={key}>
                {introLabels[key]}
              </option>
            ))}
          </select>
        </label>
        <button
          className="button button--quiet button--small"
          type="button"
          onClick={() => {
            if (!user) return;
            resetPageIntro(user.id, introKey);
            toast(`${introLabels[introKey]} tanıtımı sıfırlandı.`);
          }}
        >
          Tekrar göster
        </button>
        <button
          className="button button--quiet button--small"
          type="button"
          onClick={() => {
            if (!user) return;
            resetAllPageIntros(user.id);
            update({ pageIntros: true });
            toast('Tüm sayfa tanıtımları yeniden açıldı.');
          }}
        >
          Tüm tanıtımları yeniden göster
        </button>
      </div>
      <button
        className="button button--quiet button--small"
        type="button"
        onClick={() => {
          reset();
          toast('Arayüz tercihleri varsayılana döndü.');
        }}
      >
        <RotateCcw /> Tercihleri sıfırla
      </button>
    </section>
  );
}
