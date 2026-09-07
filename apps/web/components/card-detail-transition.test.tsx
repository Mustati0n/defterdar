import { fireEvent, render, screen } from '@testing-library/react';
import { CardDetailLink, CardDetailSurface } from './card-detail-transition';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('card to detail surface continuity', () => {
  beforeEach(() => sessionStorage.clear());

  it('marks only the matching destination after an ordinary card click', () => {
    render(
      <CardDetailLink
        href="/ledgers/ledger-1"
        className="ledger-card"
        transitionKey="ledger:ledger-1"
      >
        Ev hesabı
      </CardDetailLink>,
    );
    fireEvent.click(screen.getByRole('link', { name: 'Ev hesabı' }));

    const { container } = render(
      <CardDetailSurface transitionKey="ledger:ledger-1">
        <h1>Ev hesabı</h1>
      </CardDetailSurface>,
    );
    expect(container.firstChild).toHaveAttribute('data-from-card', 'true');
  });

  it('does not capture modified clicks or animate direct destinations', () => {
    render(
      <CardDetailLink
        href="/plans/plan-1"
        className="plan-card"
        transitionKey="plan:plan-1"
      >
        Tatil
      </CardDetailLink>,
    );
    fireEvent.click(screen.getByRole('link', { name: 'Tatil' }), {
      ctrlKey: true,
    });

    const { container } = render(
      <CardDetailSurface transitionKey="plan:plan-1">
        <h1>Tatil</h1>
      </CardDetailSurface>,
    );
    expect(container.firstChild).not.toHaveAttribute('data-from-card');
  });
});
