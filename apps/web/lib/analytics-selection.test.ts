import {
  analyticsSelectionKey,
  getAnalyticsSelection,
  setAnalyticsSelection,
} from './analytics-selection';

describe('analytics target persistence', () => {
  beforeEach(() => window.localStorage.clear());

  it('keeps the last real target scoped to its user', () => {
    setAnalyticsSelection('analytics-user-a', 'plan:plan-1');
    expect(getAnalyticsSelection('analytics-user-a')).toBe('plan:plan-1');
    expect(getAnalyticsSelection('analytics-user-b')).toBe('');
    expect(
      window.localStorage.getItem(analyticsSelectionKey('analytics-user-a')),
    ).toBe('plan:plan-1');
  });
});
