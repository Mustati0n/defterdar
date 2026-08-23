import { fireEvent, render, screen } from '@testing-library/react';
import { OnboardingExperience } from './onboarding-experience';
import { useOnboarding } from './use-onboarding';
import { useAuth } from '@/features/auth/auth-provider';
import { useLedgers } from '@/features/data/hooks';

const push = jest.fn();
const complete = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));
jest.mock('@/features/auth/auth-provider', () => ({ useAuth: jest.fn() }));
jest.mock('@/features/data/hooks', () => ({ useLedgers: jest.fn() }));
jest.mock('./use-onboarding', () => ({ useOnboarding: jest.fn() }));

describe('guided domain tour', () => {
  beforeEach(() => {
    jest.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', displayName: 'Ece', email: 'ece@example.com' },
      isBootstrapping: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
    });
    jest.mocked(useOnboarding).mockReturnValue({
      pending: true,
      complete,
      replay: jest.fn(),
    });
    jest.mocked(useLedgers).mockReturnValue({
      data: [
        {
          id: 'personal-1',
          name: 'Kişisel Defterim',
          description: null,
          type: 'PERSONAL',
          currency: 'TRY',
          ownerId: 'u1',
          role: 'OWNER',
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
          archivedAt: null,
        },
      ],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useLedgers>);
  });

  it('teaches the Defter and Plan distinction in the guided flow', () => {
    render(<OnboardingExperience />);
    fireEvent.click(screen.getByRole('button', { name: /İleri/ }));
    fireEvent.click(screen.getByRole('button', { name: /İleri/ }));
    expect(
      screen.getByRole('heading', { name: 'Defter kalır, Plan tamamlanır.' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) =>
        Boolean(
          element?.classList.contains('domain-formula') &&
          element.textContent?.includes('Defter = uzun yaşayan alan'),
        ),
      ),
    ).toBeInTheDocument();
  });

  it('finishes with a real first-action route', () => {
    render(<OnboardingExperience />);
    for (let step = 0; step < 5; step += 1) {
      fireEvent.click(screen.getByRole('button', { name: /İleri/ }));
    }
    fireEvent.click(
      screen.getByRole('button', { name: /Kişisel Defterime git/ }),
    );
    expect(complete).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith('/ledgers/personal-1');
  });
});
