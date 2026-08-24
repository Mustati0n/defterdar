import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  OnboardingExperience,
  onboardingStepNames,
} from './onboarding-experience';
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
    jest.useFakeTimers();
    push.mockClear();
    complete.mockClear();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: jest.fn().mockReturnValue({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }),
    });
    jest.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', displayName: 'Ece', email: 'ece@example.com' },
      isBootstrapping: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      updateProfile: jest.fn(),
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

  afterEach(() => jest.useRealTimers());

  function forward() {
    fireEvent.click(screen.getByRole('button', { name: /İleri/ }));
    act(() => jest.advanceTimersByTime(400));
  }

  it('teaches the Defter and Plan distinction in the guided flow', () => {
    render(<OnboardingExperience />);
    forward();
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
    forward();
    forward();
    fireEvent.click(
      screen.getByRole('button', { name: /Kişisel Defterime git/ }),
    );
    expect(complete).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith('/ledgers/personal-1');
  });

  it('uses opposite direction states and updates completed progress', () => {
    const { container } = render(<OnboardingExperience />);
    fireEvent.click(screen.getByRole('button', { name: /İleri/ }));
    expect(container.querySelector('.onboarding-step')).toHaveClass(
      'is-exiting--forward',
    );
    expect(container.querySelector('.onboarding-step')).toHaveAttribute(
      'data-direction',
      'forward',
    );
    act(() => jest.advanceTimersByTime(400));
    expect(screen.getByText('Defter ve Plan')).toBeInTheDocument();
    expect(container.querySelector('.onboarding-progress li')).toHaveClass(
      'is-complete',
    );

    fireEvent.click(screen.getByRole('button', { name: /Geri/ }));
    expect(container.querySelector('.onboarding-step')).toHaveClass(
      'is-exiting--backward',
    );
    expect(container.querySelector('.onboarding-step')).toHaveAttribute(
      'data-direction',
      'backward',
    );
    act(() => jest.advanceTimersByTime(400));
    expect(
      screen.getByRole('heading', { name: /Harcamaları hatırlamaya çalışma/ }),
    ).toBeInTheDocument();
  });

  it('keeps navigation immediate for reduced-motion users', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: jest.fn().mockReturnValue({
        matches: true,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }),
    });
    const { container } = render(<OnboardingExperience />);
    fireEvent.click(screen.getByRole('button', { name: /İleri/ }));
    expect(
      screen.getByRole('heading', { name: /Defter kalır, Plan tamamlanır/ }),
    ).toBeInTheDocument();
    expect(container.querySelector('.onboarding-step')).toHaveClass(
      'is-settled',
    );
  });

  it('lets the user skip without decorative delay', () => {
    render(<OnboardingExperience />);
    fireEvent.click(screen.getByRole('button', { name: /Tanıtımı atla/ }));
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('contains no more than three core steps or advanced finance training', () => {
    expect(onboardingStepNames).toHaveLength(3);
    render(<OnboardingExperience />);
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    expect(screen.queryByText(/Borçtan düş/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Settlement/i)).not.toBeInTheDocument();
  });
});
