'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  completeOnboarding,
  isOnboardingComplete,
  resetOnboarding,
  subscribeToOnboarding,
} from '@/lib/onboarding';

export function useOnboarding(userId: string | undefined) {
  const pending = useSyncExternalStore(
    subscribeToOnboarding,
    () => Boolean(userId && !isOnboardingComplete(userId)),
    () => false,
  );

  const complete = useCallback(() => {
    if (userId) completeOnboarding(userId);
  }, [userId]);

  const replay = useCallback(() => {
    if (userId) resetOnboarding(userId);
  }, [userId]);

  return { pending, complete, replay };
}
