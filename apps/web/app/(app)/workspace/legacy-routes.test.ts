const redirect = jest.fn();

jest.mock('next/navigation', () => ({ redirect }));

describe('legacy collection routes', () => {
  beforeEach(() => redirect.mockClear());

  it('redirects the Ledger list and preserves its create intent', async () => {
    const { default: LegacyLedgersPage } = await import('../ledgers/page');
    await LegacyLedgersPage({
      searchParams: Promise.resolve({ create: 'personal' }),
    });
    expect(redirect).toHaveBeenCalledWith(
      '/workspace?type=ledger&create=ledger&personal=1',
    );
  });

  it('redirects the Plan list and preserves bound creation context', async () => {
    const { default: LegacyPlansPage } = await import('../plans/page');
    await LegacyPlansPage({
      searchParams: Promise.resolve({ create: '1', ledgerId: 'ledger-1' }),
    });
    expect(redirect).toHaveBeenCalledWith(
      '/workspace?type=plan&create=plan&ledgerId=ledger-1',
    );
  });
});
