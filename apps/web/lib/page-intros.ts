export type PageIntroKey = 'ledgers' | 'plans' | 'analytics' | 'balances';
export const pageIntroKeys: PageIntroKey[] = [
  'ledgers',
  'plans',
  'analytics',
  'balances',
];

export interface PageIntroState {
  step: number;
  complete: boolean;
}

const initialState: PageIntroState = { step: 0, complete: false };
const serverState: PageIntroState = { step: 0, complete: true };
const cache = new Map<string, PageIntroState>();
const eventName = 'defterdar:page-intro';

export function pageIntroKey(userId: string, pageKey: PageIntroKey) {
  return `defterdar:page-intro:v1:${userId}:${pageKey}`;
}

export function getPageIntroState(
  userId: string | undefined,
  pageKey: PageIntroKey,
) {
  if (!userId || typeof window === 'undefined') return serverState;
  const key = pageIntroKey(userId, pageKey);
  const cached = cache.get(key);
  if (cached) return cached;
  try {
    const stored = window.localStorage.getItem(key);
    const state = stored
      ? ({ ...initialState, ...JSON.parse(stored) } as PageIntroState)
      : initialState;
    cache.set(key, state);
    return state;
  } catch {
    cache.set(key, initialState);
    return initialState;
  }
}

export function setPageIntroState(
  userId: string,
  pageKey: PageIntroKey,
  state: PageIntroState,
) {
  const key = pageIntroKey(userId, pageKey);
  cache.set(key, state);
  window.localStorage.setItem(key, JSON.stringify(state));
  window.dispatchEvent(new Event(eventName));
}

export function resetPageIntro(userId: string, pageKey: PageIntroKey) {
  const key = pageIntroKey(userId, pageKey);
  cache.delete(key);
  window.localStorage.removeItem(key);
  window.dispatchEvent(new Event(eventName));
}

export function resetAllPageIntros(userId: string) {
  pageIntroKeys.forEach((key) => resetPageIntro(userId, key));
}

export function subscribeToPageIntros(callback: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(eventName, callback);
  return () => window.removeEventListener(eventName, callback);
}
