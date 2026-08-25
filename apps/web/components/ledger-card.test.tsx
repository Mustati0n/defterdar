import { render, screen } from '@testing-library/react';
import { LedgerNotebookCard } from './ledger-card';
import type { Ledger } from '@/lib/types';

const base: Ledger = {
  id: 'ledger-1',
  name: 'Ev hesabı',
  description: 'Uzun süre kullanılan ortak ev kayıtları',
  type: 'SHARED',
  currency: 'TRY',
  ownerId: 'me',
  role: 'OWNER',
  activeMemberCount: 3,
  activePlanCount: 1,
  archivedAt: null,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

describe('LedgerNotebookCard', () => {
  it('uses one physical notebook family for PERSONAL and SHARED Ledgers', () => {
    const { rerender } = render(<LedgerNotebookCard ledger={base} />);
    const shared = screen.getByRole('link', { name: /Ev hesabı/ });
    expect(shared).toHaveClass('ledger-card', 'ledger-card--shared');
    expect(shared.querySelector('.ledger-card__rings')).toBeInTheDocument();

    rerender(
      <LedgerNotebookCard
        ledger={{ ...base, id: 'personal-1', type: 'PERSONAL', name: 'Benim' }}
      />,
    );
    const personal = screen.getByRole('link', { name: /Benim/ });
    expect(personal).toHaveClass('ledger-card', 'ledger-card--personal');
    expect(personal.querySelector('.ledger-card__rings')).toBeInTheDocument();
    expect(screen.getByText('Kişisel defter')).toBeInTheDocument();
  });
});
