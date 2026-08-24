import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthLayout } from '@/components/auth-layout';
import { AuthForm } from './auth-form';
import { useAuth } from './auth-provider';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));
jest.mock('./auth-provider', () => ({ useAuth: jest.fn() }));

describe('auth task priority and errors', () => {
  beforeEach(() => {
    jest.mocked(useAuth).mockReturnValue({
      user: null,
      isBootstrapping: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      updateProfile: jest.fn(),
    });
  });

  it('places the form panel before marketing content in DOM/mobile order', () => {
    const { container } = render(
      <AuthLayout eyebrow="Giriş" title="Tekrar hoş geldin" description="Giriş yap">
        <AuthForm mode="login" />
      </AuthLayout>,
    );
    const page = container.querySelector('.auth-page');
    expect(page?.firstElementChild).toHaveClass('auth-panel');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Tekrar hoş geldin',
    );
  });

  it('associates validation messages with invalid inputs', async () => {
    render(<AuthForm mode="login" />);
    fireEvent.click(screen.getByRole('button', { name: 'Deftere gir' }));
    await waitFor(() =>
      expect(screen.getByLabelText('E-posta')).toHaveAttribute(
        'aria-invalid',
        'true',
      ),
    );
    expect(screen.getByLabelText('E-posta')).toHaveAttribute(
      'aria-describedby',
      'auth-email-error',
    );
    expect(screen.getByLabelText('Şifre')).toHaveAttribute(
      'aria-describedby',
      'auth-password-error',
    );
    expect(document.getElementById('auth-email-error')).toHaveTextContent(
      /e-posta/i,
    );
  });
});
