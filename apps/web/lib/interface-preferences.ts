export type InterfaceDensity = 'comfortable' | 'compact';
export type MotionPreference = 'system' | 'standard' | 'reduced';

export interface InterfacePreferences {
  density: InterfaceDensity;
  motion: MotionPreference;
  overview: {
    ledgers: boolean;
    plans: boolean;
    activity: boolean;
  };
  pageIntros: boolean;
  adaptiveHeader: boolean;
}

export const defaultInterfacePreferences: InterfacePreferences = {
  density: 'comfortable',
  motion: 'system',
  overview: { ledgers: true, plans: true, activity: true },
  pageIntros: true,
  adaptiveHeader: true,
};

const eventName = 'defterdar:interface-preferences';
const cache = new Map<string, InterfacePreferences>();

export function interfacePreferencesKey(userId: string) {
  return `defterdar:ui-preferences:v1:${userId}`;
}

function normalize(value: Partial<InterfacePreferences>): InterfacePreferences {
  return {
    ...defaultInterfacePreferences,
    ...value,
    overview: {
      ...defaultInterfacePreferences.overview,
      ...(value.overview ?? {}),
    },
  };
}

export function getInterfacePreferences(userId: string | undefined) {
  if (!userId || typeof window === 'undefined')
    return defaultInterfacePreferences;
  const cached = cache.get(userId);
  if (cached) return cached;
  try {
    const stored = window.localStorage.getItem(interfacePreferencesKey(userId));
    const preferences = stored
      ? normalize(JSON.parse(stored) as Partial<InterfacePreferences>)
      : defaultInterfacePreferences;
    cache.set(userId, preferences);
    return preferences;
  } catch {
    cache.set(userId, defaultInterfacePreferences);
    return defaultInterfacePreferences;
  }
}

export function setInterfacePreferences(
  userId: string,
  update: Partial<InterfacePreferences>,
) {
  const current = getInterfacePreferences(userId);
  const next = normalize({
    ...current,
    ...update,
    overview: update.overview
      ? { ...current.overview, ...update.overview }
      : current.overview,
  });
  cache.set(userId, next);
  window.localStorage.setItem(
    interfacePreferencesKey(userId),
    JSON.stringify(next),
  );
  window.dispatchEvent(new Event(eventName));
}

export function resetInterfacePreferences(userId: string) {
  cache.set(userId, defaultInterfacePreferences);
  window.localStorage.removeItem(interfacePreferencesKey(userId));
  window.dispatchEvent(new Event(eventName));
}

export function subscribeToInterfacePreferences(callback: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(eventName, callback);
  return () => window.removeEventListener(eventName, callback);
}
