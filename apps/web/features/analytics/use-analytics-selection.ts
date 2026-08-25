'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  getAnalyticsSelection,
  setAnalyticsSelection,
  subscribeToAnalyticsSelection,
} from '@/lib/analytics-selection';

export function useAnalyticsSelection(userId: string | undefined) {
  const selection = useSyncExternalStore(
    subscribeToAnalyticsSelection,
    () => getAnalyticsSelection(userId),
    () => '',
  );
  const select = useCallback(
    (value: string) => {
      if (userId) setAnalyticsSelection(userId, value);
    },
    [userId],
  );
  return { selection, select };
}
