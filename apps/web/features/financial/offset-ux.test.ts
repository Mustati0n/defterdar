import {
  canManageOffset,
  offsetAfterMinor,
  shouldShowOffsetAction,
} from './offset-ux';

const eligible = {
  expenseSplitId: 'split-1',
  eligible: true,
  splitAmountMinor: '10000',
  offsetAppliedMinor: '0',
  remainingReimbursableMinor: '10000',
  priorSuggestionMinor: '30000',
  maxOffsetMinor: '7000',
  reason: null,
};

describe('Borçtan düş UX rules', () => {
  it('shows only an eligible, reimbursable and authorized action', () => {
    expect(
      shouldShowOffsetAction({
        availability: eligible,
        isGift: false,
        isReimbursable: true,
        canManage: true,
        disabled: false,
      }),
    ).toBe(true);
    expect(
      shouldShowOffsetAction({
        availability: { ...eligible, eligible: false },
        isGift: false,
        isReimbursable: true,
        canManage: true,
        disabled: false,
      }),
    ).toBe(false);
    expect(
      shouldShowOffsetAction({
        availability: eligible,
        isGift: true,
        isReimbursable: false,
        canManage: true,
        disabled: false,
      }),
    ).toBe(false);
    expect(
      shouldShowOffsetAction({
        availability: eligible,
        isGift: false,
        isReimbursable: true,
        canManage: false,
        disabled: false,
      }),
    ).toBe(false);
  });

  it('supports full and partial amounts without double-counting the split', () => {
    expect(offsetAfterMinor('30000', 7000)).toBe(23000n);
    expect(offsetAfterMinor('30000', 3000)).toBe(27000n);
  });

  it('allows owner/admin, creator or payer but not an unrelated member', () => {
    const expense = { createdById: 'creator', payerId: 'payer' };
    expect(canManageOffset('OWNER', 'other', expense)).toBe(true);
    expect(canManageOffset('MEMBER', 'creator', expense)).toBe(true);
    expect(canManageOffset('MEMBER', 'other', expense)).toBe(false);
  });
});
