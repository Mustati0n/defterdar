import { BalanceCalculator } from '../src/balances/balance-calculator.js';
describe('BalanceCalculator', () => {
  const c = new BalanceCalculator();
  const expense = (
    payerId: string,
    userId: string,
    amountMinor: bigint,
    options: { reimbursable?: boolean; voided?: boolean } = {},
  ) => ({
    payerId,
    voided: options.voided ?? false,
    splits: [
      { userId, amountMinor, isReimbursable: options.reimbursable ?? true },
    ],
  });
  it('projects reimbursable splits and preserves zero sum', () => {
    const result = c.project([expense('payer', 'debtor', 300n)]);
    expect(result).toEqual([
      { userId: 'debtor', netMinor: -300n },
      { userId: 'payer', netMinor: 300n },
    ]);
    expect(result.reduce((s, p) => s + p.netMinor, 0n)).toBe(0n);
  });
  it('ignores non-reimbursable gift/own splits and voided expenses', () => {
    expect(
      c.project([
        expense('a', 'a', 100n, { reimbursable: false }),
        expense('a', 'b', 100n, { reimbursable: false }),
        expense('a', 'b', 100n, { voided: true }),
      ]),
    ).toEqual([]);
  });
  it('nets opposing expenses and simplifies a chain', () => {
    const positions = c.project([
      expense('b', 'a', 300n),
      expense('c', 'b', 300n),
    ]);
    expect(positions).toEqual([
      { userId: 'a', netMinor: -300n },
      { userId: 'c', netMinor: 300n },
    ]);
    expect(c.suggest(positions)).toEqual([
      { fromUserId: 'a', toUserId: 'c', amountMinor: 300n },
    ]);
  });
  it('generates deterministic suggestions independent of position order', () => {
    const positions = [
      { userId: 'a', netMinor: -400n },
      { userId: 'b', netMinor: -200n },
      { userId: 'c', netMinor: 300n },
      { userId: 'd', netMinor: 300n },
    ];
    const expected = c.suggest(positions);
    expect(c.suggest([...positions].reverse())).toEqual(expected);
    expect(expected.every((s) => s.amountMinor > 0n)).toBe(true);
    const applied = new Map(positions.map((p) => [p.userId, p.netMinor]));
    for (const s of expected) {
      applied.set(s.fromUserId, applied.get(s.fromUserId)! + s.amountMinor);
      applied.set(s.toUserId, applied.get(s.toUserId)! - s.amountMinor);
    }
    expect([...applied.values()].every((v) => v === 0n)).toBe(true);
  });
  it('applies active settlements and ignores voided settlements', () => {
    expect(
      c.project([expense('b', 'a', 1_000n)], [
        { fromUserId: 'a', toUserId: 'b', amountMinor: 400n, voided: false },
        { fromUserId: 'a', toUserId: 'b', amountMinor: 500n, voided: true },
      ]),
    ).toEqual([
      { userId: 'a', netMinor: -600n },
      { userId: 'b', netMinor: 600n },
    ]);
  });
});
