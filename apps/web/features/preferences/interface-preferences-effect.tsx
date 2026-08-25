'use client';

import { useEffect } from 'react';
import { useAuth } from '@/features/auth/auth-provider';
import { useInterfacePreferences } from './use-interface-preferences';

export function InterfacePreferencesEffect() {
  const { user } = useAuth();
  const { preferences } = useInterfacePreferences(user?.id);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.density = preferences.density;
    root.dataset.motion = preferences.motion;
    root.dataset.adaptiveHeader = preferences.adaptiveHeader ? 'on' : 'off';
    return () => {
      delete root.dataset.density;
      delete root.dataset.motion;
      delete root.dataset.adaptiveHeader;
    };
  }, [preferences]);

  return null;
}
