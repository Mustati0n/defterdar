import { fireEvent, render, screen } from '@testing-library/react';
import { InterfacePreferencesPanel } from './interface-preferences-panel';
import { defaultInterfacePreferences } from '@/lib/interface-preferences';
import { useInterfacePreferences } from './use-interface-preferences';

const update = jest.fn();

jest.mock('@/features/auth/auth-provider', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));
jest.mock('@/components/ui/toast', () => ({
  useToast: () => jest.fn(),
}));
jest.mock('./use-interface-preferences', () => ({
  useInterfacePreferences: jest.fn(),
}));

describe('interface preferences panel', () => {
  it('saves the symmetric workspace card preference', () => {
    jest.mocked(useInterfacePreferences).mockReturnValue({
      preferences: defaultInterfacePreferences,
      update,
      reset: jest.fn(),
    });
    render(<InterfacePreferencesPanel />);

    const toggle = screen.getByRole('checkbox', {
      name: /Simetrik kart düzeni/,
    });
    expect(toggle).not.toBeChecked();

    fireEvent.click(toggle);
    expect(update).toHaveBeenCalledWith({ symmetricWorkspaceCards: true });
  });
});
