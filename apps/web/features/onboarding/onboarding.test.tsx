import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  completeOnboarding,
  isOnboardingComplete,
  resetOnboarding,
} from '@/lib/onboarding';
import { useOnboarding } from './use-onboarding';

const userId = 'user-1';

function Harness() {
  const { pending, complete, replay } = useOnboarding(userId);
  return (
    <div>
      <span>{pending ? 'Tanıtım açık' : 'Tanıtım kapalı'}</span>
      <button type="button" onClick={complete}>
        Tanıtımı atla
      </button>
      <button type="button" onClick={replay}>
        Tekrar göster
      </button>
    </div>
  );
}

describe('first-time onboarding persistence', () => {
  beforeEach(() => window.localStorage.clear());

  it('shows onboarding for a first-time user', () => {
    render(<Harness />);
    expect(screen.getByText('Tanıtım açık')).toBeInTheDocument();
  });

  it('does not reopen completed onboarding automatically', () => {
    completeOnboarding(userId);
    render(<Harness />);
    expect(screen.getByText('Tanıtım kapalı')).toBeInTheDocument();
  });

  it('persists Skip as completion', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Tanıtımı atla' }));
    expect(screen.getByText('Tanıtım kapalı')).toBeInTheDocument();
    expect(isOnboardingComplete(userId)).toBe(true);
  });

  it('replays onboarding after the preference is cleared', () => {
    completeOnboarding(userId);
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Tekrar göster' }));
    expect(screen.getByText('Tanıtım açık')).toBeInTheDocument();
    expect(isOnboardingComplete(userId)).toBe(false);
  });

  it('supports an external replay request', () => {
    completeOnboarding(userId);
    render(<Harness />);
    act(() => resetOnboarding(userId));
    expect(screen.getByText('Tanıtım açık')).toBeInTheDocument();
  });
});
