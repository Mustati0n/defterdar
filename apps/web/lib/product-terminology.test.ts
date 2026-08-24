import { ledgerRoleLabel, splitMethodLabel } from './format';

describe('canonical Turkish product terminology', () => {
  it.each([
    ['EQUAL', 'Eşit böl'],
    ['EXACT', 'Tutar gir'],
    ['PERCENTAGE', 'Yüzdeyle böl'],
    ['SHARES', 'Pay oranı'],
  ] as const)('maps split method %s', (value, label) => {
    expect(splitMethodLabel(value)).toBe(label);
    expect(splitMethodLabel(value)).not.toBe(value);
  });

  it.each([
    ['OWNER', 'Sahip'],
    ['ADMIN', 'Yönetici'],
    ['MEMBER', 'Üye'],
  ] as const)('maps Ledger role %s', (value, label) => {
    expect(ledgerRoleLabel(value)).toBe(label);
    expect(ledgerRoleLabel(value)).not.toBe(value);
  });
});
