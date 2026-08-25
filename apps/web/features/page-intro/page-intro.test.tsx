import { fireEvent, render, screen } from '@testing-library/react';
import { PageIntro } from './page-intro';
import { pageIntroKey } from '@/lib/page-intros';

const userId = 'page-intro-component-user';

jest.mock('@/features/auth/auth-provider', () => ({
  useAuth: () => ({ user: { id: userId, displayName: 'Ece' } }),
}));
jest.mock('@/features/onboarding/use-onboarding', () => ({
  useOnboarding: () => ({ pending: false }),
}));

describe('PageIntro', () => {
  beforeEach(() => window.localStorage.clear());

  it('persists progress, resumes, and completes without reopening', () => {
    const props = {
      pageKey: 'plans' as const,
      title: 'Plan rehberi',
      steps: ['İlk adım', 'İkinci adım'],
    };
    const first = render(<PageIntro {...props} />);
    expect(screen.getByText('İlk adım')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /İleri/ }));
    expect(screen.getByText('İkinci adım')).toBeInTheDocument();
    expect(
      JSON.parse(
        window.localStorage.getItem(pageIntroKey(userId, 'plans')) ?? '',
      ),
    ).toEqual({ step: 1, complete: false });

    first.unmount();
    render(<PageIntro {...props} />);
    expect(screen.getByText('İkinci adım')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Anladım' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(
      JSON.parse(
        window.localStorage.getItem(pageIntroKey(userId, 'plans')) ?? '',
      ),
    ).toEqual({ step: 0, complete: true });
  });
});
