'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  getPageIntroState,
  setPageIntroState,
  subscribeToPageIntros,
  type PageIntroKey,
} from '@/lib/page-intros';

export function usePageIntro(
  userId: string | undefined,
  pageKey: PageIntroKey,
) {
  const state = useSyncExternalStore(
    subscribeToPageIntros,
    () => getPageIntroState(userId, pageKey),
    () => ({ step: 0, complete: true }),
  );
  const goTo = useCallback(
    (step: number) => {
      if (userId) setPageIntroState(userId, pageKey, { step, complete: false });
    },
    [pageKey, userId],
  );
  const complete = useCallback(() => {
    if (userId) setPageIntroState(userId, pageKey, { step: 0, complete: true });
  }, [pageKey, userId]);
  return { state, goTo, complete };
}
