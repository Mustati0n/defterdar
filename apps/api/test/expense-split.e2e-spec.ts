import { ExpenseSplitCalculator } from '../src/expenses/expense-split-calculator.js';

describe('ExpenseSplitCalculator', () => {
  const calculator = new ExpenseSplitCalculator();
  const sum = (items: { amountMinor: number }[]) =>
    items.reduce((total, item) => total + item.amountMinor, 0);
  const ids = ['c', 'a', 'b'];

  it('allocates equal splits deterministically, including minor-unit remainders', () => {
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
    expect(sum(calculator.equal(100, ['a', 'b', 'c', 'd']))).toBe(100);
    expect(calculator.equal(10_000, ids)).toEqual(
      calculator.equal(10_000, [...ids].reverse()),
    );
  });

  it('validates exact amounts and participant uniqueness', () => {
    expect(
      sum(
        calculator.exact(10, [
          { userId: 'a', amountMinor: 4 },
          { userId: 'b', amountMinor: 6 },
        ]),
      ),
    ).toBe(10);
    for (const entries of [
      [
        { userId: 'a', amountMinor: 4 },
        { userId: 'b', amountMinor: 5 },
      ],
      [
        { userId: 'a', amountMinor: 5 },
        { userId: 'a', amountMinor: 5 },
      ],
      [{ userId: 'a', amountMinor: 0 }],
      [{ userId: 'a', amountMinor: 1.1 }],
    ])
      expect(() => calculator.exact(10, entries)).toThrow();
  });

  it('validates and allocates percentage and shares splits', () => {
    expect(
      sum(
        calculator.percentage(10_000, [
          { userId: 'a', percentageBps: 5000 },
          { userId: 'b', percentageBps: 2500 },
          { userId: 'c', percentageBps: 2500 },
        ]),
      ),
    ).toBe(10_000);
    expect(
      sum(
        calculator.percentage(11, [
          { userId: 'a', percentageBps: 3333 },
          { userId: 'b', percentageBps: 3333 },
          { userId: 'c', percentageBps: 3334 },
        ]),
      ),
    ).toBe(11);
    expect(() =>
      calculator.percentage(10, [{ userId: 'a', percentageBps: 9999 }]),
    ).toThrow();
    expect(() =>
      calculator.percentage(10, [{ userId: 'a', percentageBps: 10001 }]),
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
    for (const entries of [
      [{ userId: 'a', shares: 0 }],
      [{ userId: 'a', shares: -1 }],
      [{ userId: 'a', shares: 1.5 }],
      [
        { userId: 'a', shares: 1 },
        { userId: 'a', shares: 1 },
      ],
    ])
      expect(() => calculator.shares(10, entries)).toThrow();
  });
});
