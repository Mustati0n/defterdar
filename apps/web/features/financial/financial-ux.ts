import type { BalancePosition, BalanceResponse } from '@/lib/types';

export type PositionState = 'receivable' | 'payable' | 'closed';

export function positionState(netMinor: number): PositionState {
  if (netMinor > 0) return 'receivable';
  if (netMinor < 0) return 'payable';
  return 'closed';
}

export function prioritizeSuggestions(
  suggestions: BalanceResponse['suggestions'],
  currentUserId: string,
) {
  return {
    payments: suggestions.filter((item) => item.fromUserId === currentUserId),
    receivables: suggestions.filter((item) => item.toUserId === currentUserId),
    others: suggestions.filter(
      (item) =>
        item.fromUserId !== currentUserId && item.toUserId !== currentUserId,
    ),
  };
}

export function positionFor(
  positions: BalancePosition[],
  userId: string,
): BalancePosition | undefined {
  return positions.find((position) => position.user.id === userId);
}

export function remainingAfterPayment(maximumMinor: number, paidMinor: number) {
  return Math.max(0, maximumMinor - paidMinor);
}

export function canRecordForSuggestion(
  role: 'OWNER' | 'ADMIN' | 'MEMBER',
  currentUserId: string,
  suggestion: BalanceResponse['suggestions'][number],
) {
  return (
    role === 'OWNER' ||
    role === 'ADMIN' ||
    suggestion.fromUserId === currentUserId ||
    suggestion.toUserId === currentUserId
  );
}
