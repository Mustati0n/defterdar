import { InternalServerErrorException } from '@nestjs/common';

export interface BalanceExpenseInput {
  payerId: string;
  voided: boolean;
  splits: Array<{
    userId: string;
    amountMinor: bigint;
    isReimbursable: boolean;
  }>;
}

export interface BalancePosition {
  userId: string;
  netMinor: bigint;
}

export interface BalanceSettlementInput {
  fromUserId: string;
  toUserId: string;
  amountMinor: bigint;
  voided: boolean;
}

export interface SettlementSuggestion {
  fromUserId: string;
  toUserId: string;
  amountMinor: bigint;
}

export class BalanceCalculator {
  project(
    expenses: BalanceExpenseInput[],
    settlements: BalanceSettlementInput[] = [],
  ): BalancePosition[] {
    const positions = new Map<string, bigint>();
    for (const expense of expenses) {
      if (expense.voided) continue;
      for (const split of expense.splits) {
        if (!split.isReimbursable) continue;
        positions.set(
          split.userId,
          (positions.get(split.userId) ?? 0n) - split.amountMinor,
        );
        positions.set(
          expense.payerId,
          (positions.get(expense.payerId) ?? 0n) + split.amountMinor,
        );
      }
    }
    for (const settlement of settlements) {
      if (settlement.voided) continue;
      positions.set(
        settlement.fromUserId,
        (positions.get(settlement.fromUserId) ?? 0n) + settlement.amountMinor,
      );
      positions.set(
        settlement.toUserId,
        (positions.get(settlement.toUserId) ?? 0n) - settlement.amountMinor,
      );
    }
    const result = [...positions.entries()]
      .map(([userId, netMinor]) => ({ userId, netMinor }))
      .filter(({ netMinor }) => netMinor !== 0n)
      .sort((a, b) => a.userId.localeCompare(b.userId));
    if (result.reduce((sum, item) => sum + item.netMinor, 0n) !== 0n) {
      throw new InternalServerErrorException(
        'Balance projection is not zero-sum',
      );
    }
    return result;
  }

  suggest(positions: BalancePosition[]): SettlementSuggestion[] {
    const byAmount = (a: BalancePosition, b: BalancePosition) => {
      const absoluteA = a.netMinor < 0n ? -a.netMinor : a.netMinor;
      const absoluteB = b.netMinor < 0n ? -b.netMinor : b.netMinor;
      return absoluteA === absoluteB
        ? a.userId.localeCompare(b.userId)
        : absoluteA > absoluteB
          ? -1
          : 1;
    };
    const debtors = positions
      .filter(({ netMinor }) => netMinor < 0n)
      .map((item) => ({ ...item, remaining: -item.netMinor }))
      .sort(byAmount);
    const creditors = positions
      .filter(({ netMinor }) => netMinor > 0n)
      .map((item) => ({ ...item, remaining: item.netMinor }))
      .sort(byAmount);
    const suggestions: SettlementSuggestion[] = [];
    let debtorIndex = 0;
    let creditorIndex = 0;
    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
      const debtor = debtors[debtorIndex]!;
      const creditor = creditors[creditorIndex]!;
      const amountMinor =
        debtor.remaining < creditor.remaining
          ? debtor.remaining
          : creditor.remaining;
      suggestions.push({
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amountMinor,
      });
      debtor.remaining -= amountMinor;
      creditor.remaining -= amountMinor;
      if (debtor.remaining === 0n) debtorIndex += 1;
      if (creditor.remaining === 0n) creditorIndex += 1;
    }
    if (
      debtors.some(({ remaining }) => remaining !== 0n) ||
      creditors.some(({ remaining }) => remaining !== 0n)
    ) {
      throw new InternalServerErrorException(
        'Suggestions do not settle projection',
      );
    }
    return suggestions;
  }
}
