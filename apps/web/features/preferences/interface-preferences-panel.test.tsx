import { fireEvent, render, screen } from '@testing-library/react';
import { InterfacePreferencesPanel } from './interface-preferences-panel';
import { defaultInterfacePreferences } from '@/lib/interface-preferences';
import { useInterfacePreferences } from './use-interface-preferences';
import { reloadPage } from '@/lib/reload-page';

const update = jest.fn();

jest.mock('@/features/auth/auth-provider', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));
jest.mock('@/components/ui/toast', () => ({
  useToast: () => jest.fn(),
}));
jest.mock('@/lib/reload-page', () => ({ reloadPage: jest.fn() }));
jest.mock('./use-interface-preferences', () => ({
  useInterfacePreferences: jest.fn(),
}));

describe('interface preferences panel', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    [false, true],
    [true, false],
  ])(
    'saves and reloads when symmetric layout changes from %s to %s',
    (current, next) => {
      jest.mocked(useInterfacePreferences).mockReturnValue({
        preferences: {
          ...defaultInterfacePreferences,
          symmetricWorkspaceCards: current,
        },
        update,
        reset: jest.fn(),
      });
      render(<InterfacePreferencesPanel />);

      const toggle = screen.getByRole('checkbox', {
        name: /Simetrik kart düzeni/,
      });
      expect(toggle).toHaveProperty('checked', current);

      fireEvent.click(toggle);
      expect(update).toHaveBeenCalledWith({
        symmetricWorkspaceCards: next,
      });
      expect(reloadPage).toHaveBeenCalledTimes(1);
    },
  );
});
