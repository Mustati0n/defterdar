import { render, screen } from '@testing-library/react';
import { LedgerNotebookCard } from './ledger-card';
import type { Ledger } from '@/lib/types';

const base: Ledger = {
  id: 'ledger-1',
  name: 'Ev hesabı',
  description: 'Uzun süre kullanılan ortak ev kayıtları',
  currency: 'TRY',
  ownerId: 'me',
  role: 'OWNER',
  activeMemberCount: 3,
  activePlanCount: 1,
  archivedAt: null,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  isCollaborative: true,
};

describe('LedgerNotebookCard', () => {
  it('uses one physical notebook family for single-person and collaborative Ledgers', () => {
    const { rerender } = render(<LedgerNotebookCard ledger={base} />);
    const shared = screen.getByRole('link', { name: /Ev hesabı/ });
    expect(shared).toHaveClass('ledger-card', 'ledger-card--collaborative');
    expect(shared.querySelectorAll('.ledger-card__rings i')).toHaveLength(5);

    rerender(
      <LedgerNotebookCard
        ledger={{
          ...base,
          id: 'personal-1',
          name: 'Benim',
          activeMemberCount: 1,
          isCollaborative: false,
        }}
      />,
    );
    const personal = screen.getByRole('link', { name: /Benim/ });
    expect(personal).toHaveClass('ledger-card');
    expect(personal).not.toHaveClass('ledger-card--collaborative');
    expect(personal.querySelector('.ledger-card__rings')).toBeInTheDocument();
    expect(screen.getByText('Defter')).toBeInTheDocument();
  });

  it('separates role, ownership, active Plans and currency for scanning', () => {
    render(<LedgerNotebookCard ledger={base} />);

    expect(screen.getByText('Sahip')).toBeInTheDocument();
    expect(screen.getByText('3 kişi')).toBeInTheDocument();
    expect(screen.getByText('1 aktif Plan')).toBeInTheDocument();
    expect(screen.getByText('TRY')).toHaveClass('ledger-card__currency');
  });
});
