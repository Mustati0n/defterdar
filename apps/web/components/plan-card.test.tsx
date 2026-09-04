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

  it('keeps the Overview variant focused on date, participants and balance', () => {
    render(
      <PlanCard
        plan={plan}
        ledger={ledger}
        netMinor={-520000}
        referenceTime={new Date('2026-09-12T00:00:00Z').getTime()}
        variant="overview"
      />,
    );

    const card = screen.getByRole('link', { name: /Yaz tatili/ });
    expect(card).toHaveClass('plan-card--overview');
    expect(screen.getByText('3 gün kaldı')).toBeInTheDocument();
    expect(screen.getByText('4 kişi')).toBeInTheDocument();
    expect(screen.getByText('₺5.200,00 ödemen var')).toBeInTheDocument();
    expect(screen.queryByText('Devam ediyor')).not.toBeInTheDocument();
    expect(screen.queryByText(plan.description!)).not.toBeInTheDocument();
    expect(screen.queryByText('Bağlı Defter')).not.toBeInTheDocument();
    expect(screen.queryByText('Bağımsız Plan')).not.toBeInTheDocument();
  });

  it('uses a calm date label when an active Plan has already started', () => {
    render(
      <PlanCard
        plan={{ ...plan, startsAt: '2026-09-01T00:00:00Z' }}
        referenceTime={new Date('2026-09-12T00:00:00Z').getTime()}
        variant="overview"
      />,
    );

    expect(screen.getByText('Devam ediyor')).toBeInTheDocument();
    expect(screen.queryByText('TRY')).not.toBeInTheDocument();
  });

  it('calls a Plan later on the same calendar day today', () => {
    render(
      <PlanCard
        plan={{ ...plan, startsAt: '2026-09-15T20:00:00Z' }}
        referenceTime={new Date('2026-09-15T08:00:00Z').getTime()}
        variant="overview"
      />,
    );

    expect(screen.getByText('Bugün başlıyor')).toBeInTheDocument();
  });
});
