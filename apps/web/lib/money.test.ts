import { equalPreview, parseMoneyToMinor } from './money';

describe('minor-unit money helpers', () => {
  it('parses Turkish and dot decimal strings exactly', () => {
    expect(parseMoneyToMinor('1.234,56')).toBe(123456);
    expect(parseMoneyToMinor('0.29')).toBe(29);
    expect(parseMoneyToMinor('0,001')).toBeNull();
  });

  it('previews deterministic equal remainder allocation', () => {
    expect(equalPreview(1001, ['u2', 'u1', 'u3'])).toEqual([
      { userId: 'u1', amountMinor: 334 },
      { userId: 'u2', amountMinor: 334 },
      { userId: 'u3', amountMinor: 333 },
    ]);
  });
});
