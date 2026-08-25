'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  defaultInterfacePreferences,
  getInterfacePreferences,
  resetInterfacePreferences,
  setInterfacePreferences,
  subscribeToInterfacePreferences,
  type InterfacePreferences,
} from '@/lib/interface-preferences';

export function useInterfacePreferences(userId: string | undefined) {
  const preferences = useSyncExternalStore(
    subscribeToInterfacePreferences,
    () => getInterfacePreferences(userId),
    () => defaultInterfacePreferences,
  );
  const update = useCallback(
    (value: Partial<InterfacePreferences>) => {
      if (userId) setInterfacePreferences(userId, value);
    },
    [userId],
  );
  const reset = useCallback(() => {
    if (userId) resetInterfacePreferences(userId);
  }, [userId]);
  return { preferences, update, reset };
}
