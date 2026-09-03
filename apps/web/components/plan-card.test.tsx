import { render, screen } from '@testing-library/react';
import type { Ledger, Plan } from '@/lib/types';
import { PlanCard } from './plan-card';

const plan: Plan = {
  id: 'plan-1',
  ledgerId: 'ledger-1',
  scope: 'LEDGER',
  currency: 'TRY',
  name: 'Yaz tatili',
  description: 'Sahil hazırlıkları',
  startsAt: '2026-09-15T00:00:00Z',
  endsAt: null,
  status: 'ACTIVE',
  createdById: 'me',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  archivedAt: null,
  participantCount: 4,
};

const ledger: Ledger = {
  id: 'ledger-1',
  name: 'BirOS',
  description: null,
  currency: 'TRY',
  ownerId: 'me',
  role: 'OWNER',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  archivedAt: null,
};

describe('PlanCard', () => {
  it('presents title, status, main facts and secondary context in order', () => {
    render(<PlanCard plan={plan} ledger={ledger} />);
    const card = screen.getByRole('link', { name: /Yaz tatili/ });
    const orderedContent = [
      card.querySelector('h3'),
      card.querySelector('.status-chip'),
      card.querySelector('.plan-card__facts'),
      card.querySelector('.plan-card__description'),
      card.querySelector('.plan-card__context'),
    ];

    expect(orderedContent.every(Boolean)).toBe(true);
    for (let index = 1; index < orderedContent.length; index += 1) {
      expect(
        orderedContent[index - 1]!.compareDocumentPosition(
          orderedContent[index]!,
        ) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });

  it('names the linked Ledger explicitly', () => {
    render(<PlanCard plan={plan} ledger={ledger} />);

    expect(screen.getByText('Bağlı Defter')).toBeInTheDocument();
    expect(screen.getByText('BirOS içinde')).toBeInTheDocument();
  });

  it('labels standalone Plans without implying a Ledger', () => {
    render(
      <PlanCard plan={{ ...plan, ledgerId: null, scope: 'STANDALONE' }} />,
    );

    expect(screen.getByText('Bağımsız Plan')).toBeInTheDocument();
    expect(screen.getByText('TRY')).toBeInTheDocument();
    expect(screen.queryByText('Bağlı Defter')).not.toBeInTheDocument();
  });
});
