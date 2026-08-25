const eventName = 'defterdar:analytics-selection';
const cache = new Map<string, string>();

export function analyticsSelectionKey(userId: string) {
  return `defterdar:analytics-target:v1:${userId}`;
}

export function getAnalyticsSelection(userId: string | undefined) {
  if (!userId || typeof window === 'undefined') return '';
  if (cache.has(userId)) return cache.get(userId) ?? '';
  const value =
    window.localStorage.getItem(analyticsSelectionKey(userId)) ?? '';
  cache.set(userId, value);
  return value;
}

export function setAnalyticsSelection(userId: string, value: string) {
  cache.set(userId, value);
  window.localStorage.setItem(analyticsSelectionKey(userId), value);
  window.dispatchEvent(new Event(eventName));
}

export function subscribeToAnalyticsSelection(callback: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(eventName, callback);
  return () => window.removeEventListener(eventName, callback);
}
