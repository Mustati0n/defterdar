export type OnboardingDirection = 1 | -1;

export function onboardingTransitionClass(
  direction: OnboardingDirection,
  phase: 'idle' | 'exit' | 'enter',
) {
  if (phase === 'idle') return 'is-settled';
  return `${phase === 'exit' ? 'is-exiting' : 'is-entering'}--${direction === 1 ? 'forward' : 'backward'}`;
}
