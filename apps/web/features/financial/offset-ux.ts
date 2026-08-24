import type { LedgerRole, OffsetAvailability } from '@/lib/types';

export function canManageOffset(
  role: LedgerRole,
  currentUserId: string,
  expense: { createdById: string; payerId: string },
) {
  return (
    role === 'OWNER' ||
    role === 'ADMIN' ||
    expense.createdById === currentUserId ||
    expense.payerId === currentUserId
  );
}

export function shouldShowOffsetAction({
  availability,
  isGift,
  isReimbursable,
  canManage,
  disabled,
}: {
  availability: OffsetAvailability | undefined;
  isGift: boolean;
  isReimbursable: boolean;
  canManage: boolean;
  disabled: boolean;
}) {
  return Boolean(
    availability?.eligible &&
    !isGift &&
    isReimbursable &&
    canManage &&
    !disabled,
  );
}

export function offsetAfterMinor(
  priorSuggestionMinor: string,
  amountMinor: number,
) {
  return BigInt(priorSuggestionMinor) - BigInt(amountMinor);
}
