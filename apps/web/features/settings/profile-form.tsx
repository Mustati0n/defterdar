'use client';

import { Check, Save, UserRound } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/features/auth/auth-provider';
import { useToast } from '@/components/ui/toast';
import { initials } from '@/lib/format';

export function ProfileForm() {
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const savedTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (savedTimer.current) window.clearTimeout(savedTimer.current);
    },
    [],
  );

  const normalized = displayName.trim();
  const dirty = normalized !== (user?.displayName ?? '');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (normalized.length < 2 || normalized.length > 80) {
      setError('Görünen ad 2–80 karakter arasında olmalı.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateProfile(normalized);
      setSaved(true);
      toast('Profilin kaydedildi.');
      savedTimer.current = window.setTimeout(() => setSaved(false), 1600);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Profil kaydedilemedi.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="paper-section settings-profile"
      aria-labelledby="profile-heading"
    >
      <div className="settings-profile__identity">
        <span className="avatar avatar--large">
          {initials(user?.displayName ?? 'D')}
        </span>
        <div>
          <span className="eyebrow">
            <UserRound /> Hesabım
          </span>
          <h2 id="profile-heading">Profil bilgileri</h2>
          <p>{user?.email}</p>
        </div>
      </div>
      <form className="stack-form settings-profile__form" onSubmit={submit}>
        <label className="field">
          <span>Görünen ad</span>
          <input
            className="input"
            aria-label="Görünen ad"
            value={displayName}
            maxLength={80}
            autoComplete="name"
            onChange={(event) => {
              setDisplayName(event.target.value);
              setError('');
              setSaved(false);
            }}
          />
          <em>Defter ve Planlarda diğer üyeler bu adı görür.</em>
          {error ? <small role="alert">{error}</small> : null}
        </label>
        <button
          className={`button button--primary${saved ? ' is-confirmed' : ''}`}
          type="submit"
          disabled={!dirty || saving}
        >
          {saved ? (
            <>
              <Check /> Kaydedildi
            </>
          ) : saving ? (
            'Kaydediliyor…'
          ) : (
            <>
              <Save /> Değişiklikleri kaydet
            </>
          )}
        </button>
      </form>
    </section>
  );
}
