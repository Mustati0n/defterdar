import { matchesPath } from './app-shell';

describe('navigation active state', () => {
  it('keeps only the matching section active for nested routes', () => {
    expect(matchesPath('/ledgers/ledger-1', '/ledgers')).toBe(true);
    expect(matchesPath('/ledgers/ledger-1', '/plans')).toBe(false);
    expect(matchesPath('/statistics', '/statistics')).toBe(true);
    expect(matchesPath('/statistics-old', '/statistics')).toBe(false);
  });
});
