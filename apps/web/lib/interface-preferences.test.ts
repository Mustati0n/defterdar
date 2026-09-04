import {
  defaultInterfacePreferences,
  getInterfacePreferences,
  interfacePreferencesKey,
  resetInterfacePreferences,
  setInterfacePreferences,
} from './interface-preferences';

describe('interface preferences persistence', () => {
  beforeEach(() => window.localStorage.clear());

  it('uses stable defaults and keeps preferences scoped per user', () => {
    const first = 'preferences-user-a';
    const second = 'preferences-user-b';
    expect(getInterfacePreferences(first)).toEqual(defaultInterfacePreferences);
    setInterfacePreferences(first, {
      density: 'compact',
      motion: 'reduced',
      symmetricWorkspaceCards: true,
      overview: { ledgers: false, plans: true, activity: true },
    });
    expect(getInterfacePreferences(first).density).toBe('compact');
    expect(getInterfacePreferences(first).symmetricWorkspaceCards).toBe(true);
    expect(getInterfacePreferences(second)).toEqual(
      defaultInterfacePreferences,
    );
    expect(
      window.localStorage.getItem(interfacePreferencesKey(second)),
    ).toBeNull();
  });

  it('resets only the current user', () => {
    const first = 'preferences-reset-a';
    const second = 'preferences-reset-b';
    setInterfacePreferences(first, { adaptiveHeader: false });
    setInterfacePreferences(second, { density: 'compact' });
    resetInterfacePreferences(first);
    expect(getInterfacePreferences(first)).toEqual(defaultInterfacePreferences);
    expect(getInterfacePreferences(second).density).toBe('compact');
  });

  it('fills the symmetric layout default for preferences saved before it existed', () => {
    const userId = 'preferences-legacy';
    window.localStorage.setItem(
      interfacePreferencesKey(userId),
      JSON.stringify({ density: 'compact' }),
    );

    expect(getInterfacePreferences(userId).symmetricWorkspaceCards).toBe(false);
  });
});
