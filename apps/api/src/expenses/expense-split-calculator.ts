import { BadRequestException } from '@nestjs/common';

export type SplitEntry = { userId: string; amountMinor: number };
type WeightEntry = { userId: string; weight: number };

export class ExpenseSplitCalculator {
  equal(amountMinor: number, userIds: string[]): SplitEntry[] {
    return this.allocate(
      amountMinor,
      userIds.map((userId) => ({ userId, weight: 1 })),
    );
  }

  exact(amountMinor: number, entries: SplitEntry[]): SplitEntry[] {
    this.validateUsers(entries.map((entry) => entry.userId));
    if (
      entries.some(
        (entry) =>
          !Number.isSafeInteger(entry.amountMinor) || entry.amountMinor <= 0,
      )
    )
      throw new BadRequestException(
        'Split amounts must be positive safe integers',
      );
    if (
      entries.reduce((sum, entry) => sum + entry.amountMinor, 0) !== amountMinor
    )
      throw new BadRequestException('Exact splits must equal expense amount');
    return [...entries].sort((a, b) => a.userId.localeCompare(b.userId));
  }

  percentage(
    amountMinor: number,
    entries: { userId: string; percentageBps: number }[],
  ): SplitEntry[] {
    if (entries.reduce((sum, entry) => sum + entry.percentageBps, 0) !== 10_000)
      throw new BadRequestException(
        'Percentages must total 10000 basis points',
      );
    return this.allocate(
      amountMinor,
      entries.map((entry) => ({
        userId: entry.userId,
        weight: entry.percentageBps,
      })),
    );
  }

  shares(
    amountMinor: number,
    entries: { userId: string; shares: number }[],
  ): SplitEntry[] {
    return this.allocate(
      amountMinor,
      entries.map((entry) => ({ userId: entry.userId, weight: entry.shares })),
    );
  }

  private allocate(amountMinor: number, entries: WeightEntry[]): SplitEntry[] {
    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0)
      throw new BadRequestException(
        'amountMinor must be a positive safe integer',
      );
    this.validateUsers(entries.map((entry) => entry.userId));
    if (
      entries.some(
        (entry) => !Number.isSafeInteger(entry.weight) || entry.weight <= 0,
      )
    )
      throw new BadRequestException(
        'Split weights must be positive safe integers',
      );
    const ordered = [...entries].sort((a, b) =>
      a.userId.localeCompare(b.userId),
    );
    const totalWeight = ordered.reduce((sum, entry) => sum + entry.weight, 0);
    const shares = ordered.map((entry) => ({
      ...entry,
      amountMinor: Math.floor((amountMinor * entry.weight) / totalWeight),
      remainder: (amountMinor * entry.weight) % totalWeight,
    }));
    const remaining =
      amountMinor - shares.reduce((sum, entry) => sum + entry.amountMinor, 0);
    shares.sort(
      (a, b) => b.remainder - a.remainder || a.userId.localeCompare(b.userId),
    );
    for (let index = 0; index < remaining; index += 1)
      shares[index]!.amountMinor += 1;
    return shares
      .map(({ userId, amountMinor: result }) => ({
        userId,
        amountMinor: result,
      }))
      .sort((a, b) => a.userId.localeCompare(b.userId));
  }

  private validateUsers(userIds: string[]): void {
    if (userIds.length === 0)
      throw new BadRequestException(
        'At least one split participant is required',
      );
    if (new Set(userIds).size !== userIds.length)
      throw new BadRequestException('Split users must be unique');
  }
}
