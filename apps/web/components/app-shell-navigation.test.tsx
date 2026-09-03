import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { writeRecentItems } from '@/lib/recent-items';
import { accessibilityViolations } from '@/test/accessibility';
import { AppShell } from './app-shell';

jest.mock('next/navigation', () => ({
  usePathname: () => '/overview',
  useRouter: () => ({ replace: jest.fn() }),
}));
jest.mock('next/dynamic', () => () => () => null);
jest.mock('@/features/auth/auth-provider', () => ({
  useAuth: () => ({
    user: { id: 'user-1', displayName: 'Mustafa Kaya', email: 'm@example.com' },
    isBootstrapping: false,
    logout: jest.fn(),
  }),
}));
jest.mock('@/features/auth/use-protected-route', () => ({
  useProtectedRoute: () => true,
}));
jest.mock('@/features/data/hooks', () => ({
  useLedger: () => ({ data: undefined }),
  usePlan: () => ({ data: undefined }),
}));
jest.mock('@/features/onboarding/onboarding-experience', () => ({
  OnboardingExperience: () => null,
}));
jest.mock('@/features/preferences/interface-preferences-effect', () => ({
  InterfacePreferencesEffect: () => null,
}));
jest.mock('./floating-quick-add', () => ({
  FloatingQuickAdd: () => <div data-testid="global-create" />,
}));
jest.mock('./signature-line', () => ({ SignatureLine: () => null }));

describe('AppShell sidebar V2', () => {
  beforeEach(() => {
    window.localStorage.clear();
    writeRecentItems('user-1', [
      {
        id: 'ledger-1',
        kind: 'ledger',
        name: 'BirOS',
        visitedAt: 10,
      },
    ]);
  });

  it('separates primary navigation, recents and account settings', () => {
    render(<AppShell>İçerik</AppShell>);

    const primary = screen.getByRole('navigation', { name: 'Ana menü' });
    expect(primary).toHaveTextContent('Özet');
    expect(primary).toHaveTextContent('Defterler & Planlar');
    expect(primary).toHaveTextContent('İstatistikler');
    expect(primary).not.toHaveTextContent('Ayarlar');
    expect(screen.getByRole('link', { name: /BirOS/ })).toHaveAttribute(
      'href',
      '/ledgers/ledger-1',
    );
    expect(
      screen.getByRole('navigation', { name: 'Hesap ayarları' }),
    ).toHaveTextContent('Ayarlar');
    expect(screen.queryByText('Hızlı ekle')).not.toBeInTheDocument();
  });

  it('offers a keyboard skip link to the focusable route content', () => {
    render(<AppShell>İçerik</AppShell>);

    const skipLink = screen.getByRole('link', { name: 'Ana içeriğe geç' });
    const content = document.querySelector<HTMLElement>('#main-content');
    expect(skipLink).toHaveAttribute('href', '#main-content');
    expect(content).toHaveAttribute('tabindex', '-1');
    content?.focus();
    expect(content).toHaveFocus();
  });

  it('opens the mobile drawer, traps focus and closes with Escape', async () => {
    render(<AppShell>İçerik</AppShell>);
    const trigger = screen.getByRole('button', { name: 'Menüyü aç' });

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const drawer = screen.getByRole('dialog', { name: 'Uygulama menüsü' });
    expect(drawer).toBeVisible();
    await waitFor(() =>
      expect(
        within(drawer).getByRole('button', { name: 'Menüyü kapat' }),
      ).toHaveFocus(),
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('has no detectable structural accessibility violations', async () => {
    const { container } = render(<AppShell>İçerik</AppShell>);
    expect(await accessibilityViolations(container)).toEqual([]);
  });
});
