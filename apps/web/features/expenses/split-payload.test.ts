import { buildSplit } from './split-payload';

describe('Expense split payloads', () => {
  it('creates EQUAL with selected people', () => {
    expect(buildSplit('EQUAL', ['u1', 'u2'], {}, 1001)).toEqual({
      method: 'EQUAL',
      participantUserIds: ['u1', 'u2'],
    });
  });

  it('creates exact minor-unit entries without floating point conversion', () => {
    expect(
      buildSplit('EXACT', ['u1', 'u2'], { u1: '10,01', u2: '20.00' }, 3001),
    ).toEqual({
      method: 'EXACT',
      entries: [
        { userId: 'u1', amountMinor: 1001 },
        { userId: 'u2', amountMinor: 2000 },
      ],
    });
  });

  it('creates percentage basis points totaling 100%', () => {
    expect(
      buildSplit(
        'PERCENTAGE',
        ['u1', 'u2'],
        { u1: '33,33', u2: '66,67' },
        9999,
      ),
    ).toEqual({
      method: 'PERCENTAGE',
      entries: [
        { userId: 'u1', percentageBps: 3333 },
        { userId: 'u2', percentageBps: 6667 },
      ],
    });
  });

  it('creates integer SHARE entries', () => {
    expect(
      buildSplit('SHARES', ['u1', 'u2'], { u1: '1', u2: '3' }, 1000),
    ).toEqual({
      method: 'SHARES',
      entries: [
        { userId: 'u1', shares: 1 },
        { userId: 'u2', shares: 3 },
      ],
    });
  });

  it('allows the payer to be excluded because participants are independent', () => {
    expect(buildSplit('EQUAL', ['guest'], {}, 500).participantUserIds).toEqual([
      'guest',
    ]);
  });

  it('rejects invalid exact, percentage and share totals before mutation', () => {
    expect(() => buildSplit('EXACT', ['u1'], { u1: '1' }, 200)).toThrow(
      /toplamı/,
    );
    expect(() => buildSplit('PERCENTAGE', ['u1'], { u1: '99' }, 200)).toThrow(
      /%100/,
    );
    expect(() => buildSplit('SHARES', ['u1'], { u1: '0' }, 200)).toThrow(
      /en az 1 pay/,
    );
  });
});
