import { render, screen } from '@testing-library/react';
import { FinancialPosition } from './financial-position';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('FinancialPosition', () => {
  it.each([
    ['DEBTOR', 'Borcun var'],
    ['CREDITOR', 'Alacağın var'],
    ['SETTLED', 'Hesabın kapalı'],
    ['NO_ACTIVITY', 'Henüz hesap oluşmadı'],
    ['PENDING_APPROVAL', 'Onayın gerekiyor'],
  ] as const)('renders the %s state with explicit text', (state, title) => {
    render(<FinancialPosition state={state} currency="TRY" />);
    expect(screen.getByRole('heading', { name: title })).toBeVisible();
  });

  it('renders only authoritative payment directions and amounts', () => {
    render(
      <FinancialPosition
        state="DEBTOR"
        currency="TRY"
        amountMinor={124000}
        items={[
          { id: 'a', label: 'Ahmet’e', amountMinor: 80000 },
          { id: 'b', label: 'Mehmet’e', amountMinor: 44000 },
        ]}
        action={{ href: '/hesap', label: 'Hesabı incele' }}
      />,
    );

    expect(screen.getByText(/1\.240/)).toBeVisible();
    expect(screen.getByText('Ahmet’e')).toBeVisible();
    expect(screen.getByText(/800/)).toBeVisible();
    expect(screen.getByRole('link', { name: /Hesabı incele/ })).toHaveAttribute(
      'href',
      '/hesap',
    );
  });

  it('explains the count and impact of a pending approval', () => {
    render(
      <FinancialPosition
        state="PENDING_APPROVAL"
        currency="TRY"
        amountMinor={17500}
        pendingCount={2}
      />,
    );

    expect(
      screen.getByText('2 yeni hareket senden onay bekliyor.'),
    ).toBeVisible();
    expect(screen.getByText(/175/)).toBeVisible();
  });

  it('programmatically associates each financial state with its explanation', () => {
    render(<FinancialPosition state="DEBTOR" currency="TRY" />);

    const position = screen.getByRole('region', { name: 'Borcun var' });
    const descriptionId = position.getAttribute('aria-describedby');

    expect(descriptionId).toBeTruthy();
    expect(document.getElementById(descriptionId!)).toHaveTextContent(
      'Hesabı kapatmak için yapman gereken net ödemeler.',
    );
  });
});
