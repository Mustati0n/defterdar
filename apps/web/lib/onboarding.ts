export type OnboardingScenario = 'personal' | 'home' | 'plans';

const EVENT_NAME = 'defterdar:onboarding-change';

export function onboardingKey(userId: string): string {
  return `defterdar:onboarding:${userId}`;
}

export function onboardingScenarioKey(userId: string): string {
  return `defterdar:onboarding-scenario:${userId}`;
}

export function isOnboardingComplete(userId: string): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(onboardingKey(userId)) === 'complete';
}

export function completeOnboarding(userId: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(onboardingKey(userId), 'complete');
  notifyOnboardingChange();
}

export function resetOnboarding(userId: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(onboardingKey(userId));
  notifyOnboardingChange();
}

export function saveOnboardingScenario(
  userId: string,
  scenario: OnboardingScenario,
): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(onboardingScenarioKey(userId), scenario);
}

export function subscribeToOnboarding(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(EVENT_NAME, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(EVENT_NAME, callback);
    window.removeEventListener('storage', callback);
  };
}

function notifyOnboardingChange(): void {
  window.dispatchEvent(new Event(EVENT_NAME));
}
