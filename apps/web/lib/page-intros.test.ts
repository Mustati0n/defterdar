import {
  getPageIntroState,
  pageIntroKey,
  resetAllPageIntros,
  setPageIntroState,
} from './page-intros';

describe('page intro persistence', () => {
  beforeEach(() => window.localStorage.clear());

  it('resumes the last incomplete step without crossing user scope', () => {
    const first = 'intro-user-a';
    const second = 'intro-user-b';
    setPageIntroState(first, 'plans', { step: 1, complete: false });
    expect(getPageIntroState(first, 'plans')).toEqual({
      step: 1,
      complete: false,
    });
    expect(getPageIntroState(second, 'plans')).toEqual({
      step: 0,
      complete: false,
    });
  });

  it('resets every known intro for one user', () => {
    const userId = 'intro-reset-user';
    setPageIntroState(userId, 'ledgers', { step: 0, complete: true });
    setPageIntroState(userId, 'balances', { step: 0, complete: true });
    resetAllPageIntros(userId);
    expect(
      window.localStorage.getItem(pageIntroKey(userId, 'ledgers')),
    ).toBeNull();
    expect(
      window.localStorage.getItem(pageIntroKey(userId, 'balances')),
    ).toBeNull();
    expect(getPageIntroState(userId, 'ledgers').complete).toBe(false);
  });
});
