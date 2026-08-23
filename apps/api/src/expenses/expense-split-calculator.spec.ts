import { ExpenseSplitCalculator } from './expense-split-calculator.js';

describe('ExpenseSplitCalculator', () => {
  const calculator = new ExpenseSplitCalculator();
  const ids = ['c', 'a', 'b'];
  const sum = (entries: { amountMinor: number }[]) =>
    entries.reduce((total, entry) => total + entry.amountMinor, 0);

  it('uses deterministic largest remainder allocation', () => {
    expect(calculator.equal(10_000, ids)).toEqual([
      { userId: 'a', amountMinor: 3334 },
      { userId: 'b', amountMinor: 3333 },
      { userId: 'c', amountMinor: 3333 },
    ]);
    expect(calculator.equal(1, ids)).toEqual([
      { userId: 'a', amountMinor: 1 },
      { userId: 'b', amountMinor: 0 },
      { userId: 'c', amountMinor: 0 },
    ]);
    expect(calculator.equal(12, ids)).toEqual([
      { userId: 'a', amountMinor: 4 },
      { userId: 'b', amountMinor: 4 },
      { userId: 'c', amountMinor: 4 },
    ]);
    expect(calculator.equal(10_000, ids)).toEqual(
      calculator.equal(10_000, [...ids].reverse()),
    );
  });

  it('validates exact splits', () => {
    expect(
      calculator.exact(10, [
        { userId: 'a', amountMinor: 4 },
        { userId: 'b', amountMinor: 6 },
      ]),
    ).toHaveLength(2);
    expect(() =>
      calculator.exact(10, [
        { userId: 'a', amountMinor: 4 },
        { userId: 'b', amountMinor: 5 },
      ]),
    ).toThrow();
    expect(() =>
      calculator.exact(10, [
        { userId: 'a', amountMinor: 4 },
        { userId: 'a', amountMinor: 6 },
      ]),
    ).toThrow();
  });

  it('handles percentage and shares without losing a minor unit', () => {
    expect(
      sum(
        calculator.percentage(10_000, [
          { userId: 'a', percentageBps: 5000 },
          { userId: 'b', percentageBps: 2500 },
          { userId: 'c', percentageBps: 2500 },
        ]),
      ),
    ).toBe(10_000);
    expect(() =>
      calculator.percentage(10, [{ userId: 'a', percentageBps: 9999 }]),
    ).toThrow();
    expect(
      sum(
        calculator.shares(11, [
          { userId: 'a', shares: 2 },
          { userId: 'b', shares: 1 },
          { userId: 'c', shares: 1 },
        ]),
      ),
    ).toBe(11);
    expect(() => calculator.shares(10, [{ userId: 'a', shares: 0 }])).toThrow();
  });
});
