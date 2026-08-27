import { fireEvent, render, screen } from '@testing-library/react';
import { AnalyticsDateControls, AnalyticsView } from './analytics-experience';
import { analyticsDateRange, analyticsPresets } from './analytics-date';
import type { AnalyticsSummary } from '@/lib/types';

const summary: AnalyticsSummary = {
  currency: 'TRY',
  totalExpenseMinor: '845000',
  totalIncomeMinor: '120000',
  netCashflowMinor: '-725000',
  expenseCount: 16,
  incomeCount: 2,
  byCategory: [
    {
      category: { id: 'c1', name: 'Market' },
      expenseMinor: '500000',
      incomeMinor: '0',
    },
    { category: null, expenseMinor: '345000', incomeMinor: '120000' },
  ],
  monthly: [
    { month: '2026-07', expenseMinor: '300000', incomeMinor: '0' },
    { month: '2026-08', expenseMinor: '545000', incomeMinor: '120000' },
  ],
  paidByMember: [
    { user: { id: 'u1', displayName: 'Ece' }, amountMinor: '845000' },
  ],
  shareByMember: [
    { user: { id: 'u2', displayName: 'Can' }, amountMinor: '422500' },
  ],
  currentBalances: {
    currency: 'TRY',
    positions: [
      { user: { id: 'u1', displayName: 'Ece' }, netMinor: 12000 },
      { user: { id: 'u2', displayName: 'Can' }, netMinor: -12000 },
    ],
    suggestions: [{ fromUserId: 'u2', toUserId: 'u1', amountMinor: 12000 }],
  },
};

describe('analytics product experience', () => {
  it('answers ledger totals, categories, monthly values and member questions', () => {
    render(<AnalyticsView data={summary} />);
    expect(screen.getByText('Harcama')).toBeInTheDocument();
    expect(screen.getByText(/en çok/)).toHaveTextContent('Market');
    expect(
      screen.getByRole('img', { name: /Aylara göre harcama ve gelir/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('list', { name: 'Aylık değerler' }),
    ).toHaveTextContent('Tem 26');
    expect(
      screen.getByRole('heading', { name: 'Kim ne kadar ödedi?' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Güncel bakiyeler' }),
    ).toBeInTheDocument();
  });

  it('keeps Personal analytics focused on cashflow', () => {
    render(<AnalyticsView data={summary} personal />);
    expect(screen.getByText('Net')).toBeInTheDocument();
    expect(screen.queryByText('Kim ne kadar ödedi?')).not.toBeInTheDocument();
    expect(screen.queryByText('Güncel bakiyeler')).not.toBeInTheDocument();
  });

  it('shows a completed Plan final summary with remaining payment context', () => {
    render(
      <AnalyticsView
        data={summary}
        planStatus="COMPLETED"
        participantCount={4}
      />,
    );
    expect(screen.getByText('Plan tamamlandı')).toBeInTheDocument();
    expect(screen.getByText('18 hareket')).toBeInTheDocument();
    expect(screen.getByText('4 kişi')).toBeInTheDocument();
    expect(screen.getByText(/Kapanmayı bekleyen ödemeler/)).toBeInTheDocument();
  });

  it('renders an honest empty period', () => {
    render(
      <AnalyticsView data={{ ...summary, expenseCount: 0, incomeCount: 0 }} />,
    );
    expect(
      screen.getByText('Bu dönemde kayıtlı hareket yok.'),
    ).toBeInTheDocument();
  });

  it('provides all required date presets and deterministic ranges', () => {
    expect(analyticsPresets.map((preset) => preset.label)).toEqual([
      'Bu ay',
      'Son 3 ay',
      'Son 6 ay',
      'Bu yıl',
      'Tüm zamanlar',
      'Özel tarih',
    ]);
    const range = analyticsDateRange(
      '3months',
      new Date('2026-08-24T12:00:00Z'),
    );
    expect(new Date(range.from!).getMonth()).toBe(5);
    expect(new Date(range.from!).getDate()).toBe(1);
    expect(new Date(range.to!).getDate()).toBe(24);
    expect(analyticsDateRange('all')).toEqual({});
  });

  it('keeps the selected period available through the compact selector', () => {
    const setPreset = jest.fn();
    render(
      <AnalyticsDateControls
        preset="3months"
        custom={{ from: '', to: '' }}
        setPreset={setPreset}
        setCustom={jest.fn()}
      />,
    );
    const compact = screen.getByLabelText('Tarih aralığı');
    expect(compact).toHaveValue('3months');
    fireEvent.change(compact, { target: { value: 'year' } });
    expect(setPreset).toHaveBeenCalledWith('year');
  });
});
