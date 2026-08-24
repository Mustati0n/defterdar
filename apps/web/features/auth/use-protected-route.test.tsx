import { render, screen, waitFor } from '@testing-library/react';
import { useProtectedRoute } from './use-protected-route';
import { useAuth } from './auth-provider';

const replace = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => '/ledgers/private-ledger',
  useRouter: () => ({ replace }),
}));

jest.mock('./auth-provider', () => ({
  useAuth: jest.fn(),
}));

function Harness() {
  const ready = useProtectedRoute();
  return <span>{ready ? 'Korumalı içerik' : 'Oturum bekleniyor'}</span>;
}

describe('protected route behavior', () => {
  it('redirects an unauthenticated user and preserves the destination', async () => {
    jest.mocked(useAuth).mockReturnValue({
      user: null,
      isBootstrapping: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      updateProfile: jest.fn(),
    });
    render(<Harness />);
    expect(screen.getByText('Oturum bekleniyor')).toBeInTheDocument();
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        '/login?next=%2Fledgers%2Fprivate-ledger',
      ),
    );
  });

  it('renders protected content for an authenticated user', () => {
    jest.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', displayName: 'Ece', email: 'ece@example.com' },
      isBootstrapping: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      updateProfile: jest.fn(),
    });
    render(<Harness />);
    expect(screen.getByText('Korumalı içerik')).toBeInTheDocument();
  });
});
