import { fireEvent, render, screen } from '@testing-library/react';
import SettingsPage from './page';
import { useAuth } from '@/features/auth/auth-provider';
import { useOnboarding } from '@/features/onboarding/use-onboarding';

const push = jest.fn();
const replay = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
jest.mock('@/features/auth/auth-provider', () => ({ useAuth: jest.fn() }));
jest.mock('@/features/onboarding/use-onboarding', () => ({
  useOnboarding: jest.fn(),
}));
jest.mock('@/features/settings/profile-form', () => ({
  ProfileForm: () => <div>Profil formu</div>,
}));
jest.mock('@/features/settings/category-manager', () => ({
  CategoryManager: () => <div>Kategori yönetimi</div>,
}));

describe('settings hub', () => {
  it('replays the real onboarding tour from Overview', () => {
    jest.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', displayName: 'Ece', email: 'ece@example.com' },
      isBootstrapping: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      updateProfile: jest.fn(),
    });
    jest
      .mocked(useOnboarding)
      .mockReturnValue({ pending: false, complete: jest.fn(), replay });
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Tekrar başlat' }));
    expect(replay).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/overview');
  });
});
