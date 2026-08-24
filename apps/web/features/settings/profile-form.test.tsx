import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProfileForm } from './profile-form';
import { useAuth } from '@/features/auth/auth-provider';
import { useToast } from '@/components/ui/toast';

jest.mock('@/features/auth/auth-provider', () => ({ useAuth: jest.fn() }));
jest.mock('@/components/ui/toast', () => ({ useToast: jest.fn() }));

describe('profile settings', () => {
  it('tracks dirty state and confirms only after the API update', async () => {
    let resolveUpdate: (() => void) | undefined;
    const updateProfile = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveUpdate = resolve;
        }),
    );
    const toast = jest.fn();
    jest.mocked(useToast).mockReturnValue(toast);
    jest.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', displayName: 'Ece', email: 'ece@example.com' },
      isBootstrapping: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      updateProfile,
    });
    render(<ProfileForm />);
    const save = screen.getByRole('button', { name: /Değişiklikleri kaydet/ });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Görünen ad'), {
      target: { value: 'Ece Yılmaz' },
    });
    fireEvent.click(save);
    expect(screen.getByText('Kaydediliyor…')).toBeInTheDocument();
    expect(screen.queryByText('Kaydedildi')).not.toBeInTheDocument();
    resolveUpdate?.();
    await waitFor(() =>
      expect(screen.getByText('Kaydedildi')).toBeInTheDocument(),
    );
    expect(updateProfile).toHaveBeenCalledWith('Ece Yılmaz');
    expect(toast).toHaveBeenCalledWith('Profilin kaydedildi.');
  });

  it('shows validation without sending an invalid name', () => {
    const updateProfile = jest.fn();
    jest.mocked(useToast).mockReturnValue(jest.fn());
    jest.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', displayName: 'Ece', email: 'ece@example.com' },
      isBootstrapping: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      updateProfile,
    });
    render(<ProfileForm />);
    fireEvent.change(screen.getByLabelText('Görünen ad'), {
      target: { value: 'E' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /Değişiklikleri kaydet/ }),
    );
    expect(screen.getByRole('alert')).toHaveTextContent('2–80');
    expect(updateProfile).not.toHaveBeenCalled();
  });
});
