import {
  canRecordForSuggestion,
  positionState,
  prioritizeSuggestions,
  remainingAfterPayment,
} from './financial-ux';

const suggestions = [
  { fromUserId: 'me', toUserId: 'ada', amountMinor: 12000 },
  { fromUserId: 'ece', toUserId: 'me', amountMinor: 8000 },
  { fromUserId: 'ece', toUserId: 'ada', amountMinor: 3000 },
];

describe('financial product language and prioritization', () => {
  it('maps positive, negative and zero positions to user-facing states', () => {
    expect(positionState(1)).toBe('receivable');
    expect(positionState(-1)).toBe('payable');
    expect(positionState(0)).toBe('closed');
  });

  it('prioritizes the current user payment and receivable separately', () => {
    expect(prioritizeSuggestions(suggestions, 'me')).toEqual({
      payments: [suggestions[0]],
      receivables: [suggestions[1]],
      others: [suggestions[2]],
    });
  });

  it('supports partial payment preview and blocks unrelated MEMBER actions', () => {
    expect(remainingAfterPayment(30000, 10000)).toBe(20000);
    expect(canRecordForSuggestion('MEMBER', 'me', suggestions[2]!)).toBe(false);
    expect(canRecordForSuggestion('ADMIN', 'me', suggestions[2]!)).toBe(true);
  });
});
