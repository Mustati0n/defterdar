import { api } from './api-client';

const fetchMock = jest.fn();
const json = (body: unknown, status = 200) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);

describe('product-flow API contracts', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    Object.defineProperty(global, 'fetch', {
      value: fetchMock,
      configurable: true,
    });
    Object.defineProperty(globalThis.crypto, 'randomUUID', {
      value: () => '11111111-1111-4111-8111-111111111111',
      configurable: true,
    });
    localStorage.clear();
  });

  it('creates a Ledger and binds a Plan under the selected Ledger', async () => {
    fetchMock
      .mockImplementationOnce(() => json({ id: 'ledger-1' }, 201))
      .mockImplementationOnce(() =>
        json({ id: 'plan-1', ledgerId: 'ledger-1' }, 201),
      );
    await api.ledgers.create({ name: 'Ev', currency: 'TRY' });
    await api.plans.create('ledger-1', { name: 'Tatil' });
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/ledgers$/);
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/ledgers\/ledger-1\/plans$/);
  });

  it('creates an invitation without exposing its token in logs or query strings', async () => {
    fetchMock.mockImplementationOnce(() =>
      json({ token: 'secret', expiresAt: '2026-01-02' }, 201),
    );
    await api.ledgers.invite('ledger-1', 'arkadas@example.com');
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/ledgers\/ledger-1\/invitations$/);
    expect(JSON.parse(options.body as string)).toEqual({
      email: 'arkadas@example.com',
    });
  });

  it('creates Ismarla with category and a split that may exclude payer', async () => {
    fetchMock.mockImplementationOnce(() => json({ id: 'expense-1' }, 201));
    await api.expenses.create('ledger-1', {
      title: 'Yemek',
      amountMinor: 1000,
      payerUserId: 'payer',
      categoryId: 'food',
      planId: 'plan-1',
      isGift: true,
      expenseDate: '2026-01-01T12:00:00.000Z',
      split: { method: 'EQUAL', participantUserIds: ['guest'] },
    });
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(options.body as string)).toMatchObject({
      payerUserId: 'payer',
      categoryId: 'food',
      planId: 'plan-1',
      isGift: true,
      split: { participantUserIds: ['guest'] },
    });
  });

  it('sends expectedVersion and translates stale/offset edit conflicts', async () => {
    fetchMock
      .mockImplementationOnce(() => json({ id: 'expense-1', version: 3 }))
      .mockImplementationOnce(() =>
        json({ message: 'Expense version does not match' }, 409),
      )
      .mockImplementationOnce(() =>
        json(
          { message: 'Active offsets block financial expense mutation' },
          409,
        ),
      );
    await api.expenses.update('expense-1', {
      expectedVersion: 2,
      title: 'Yeni',
    });
    expect(
      JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string),
    ).toMatchObject({ expectedVersion: 2 });
    await expect(
      api.expenses.update('expense-1', { expectedVersion: 2 }),
    ).rejects.toMatchObject({
      message: expect.stringMatching(/başka bir yerde güncellendi/),
    });
    await expect(
      api.expenses.update('expense-1', { expectedVersion: 2, amountMinor: 5 }),
    ).rejects.toMatchObject({
      message: expect.stringMatching(/Borçtan düş/),
    });
  });

  it('uses soft-void and receipt reserve/complete/remove endpoints', async () => {
    fetchMock
      .mockImplementationOnce(() =>
        json({ id: 'expense-1', voidedAt: '2026-01-01' }),
      )
      .mockImplementationOnce(() =>
        json(
          {
            attachmentId: 'a1',
            uploadUrl: 'https://storage.test',
            expiresAt: '2026-01-01',
          },
          201,
        ),
      )
      .mockImplementationOnce(() => json({ id: 'a1', status: 'READY' }))
      .mockImplementationOnce(() => json(undefined, 204));
    await api.expenses.void('expense-1');
    await api.expenses.reserveAttachment('expense-1', {
      fileName: 'fis.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 100,
    });
    await api.attachments.complete('a1');
    await api.attachments.remove('a1');
    expect(
      fetchMock.mock.calls.map((call) => new URL(String(call[0])).pathname),
    ).toEqual([
      '/expenses/expense-1/void',
      '/expenses/expense-1/attachments',
      '/attachments/a1/complete',
      '/attachments/a1',
    ]);
  });

  it('surfaces plan move conflicts as actionable conflict feedback', async () => {
    fetchMock.mockImplementationOnce(() =>
      json(
        { message: 'Plan participants must be members of target ledger' },
        409,
      ),
    );
    await expect(api.plans.move('plan-1', 'ledger-2')).rejects.toMatchObject({
      status: 409,
      message: expect.stringMatching(/hedef Deftere/),
    });
  });

  it('uses explicit participant and complete/reopen Plan transitions', async () => {
    fetchMock.mockImplementation(() => json({}));
    await api.plans.addParticipant('plan-1', 'user-2');
    await api.plans.removeParticipant('plan-1', 'user-2');
    await api.plans.complete('plan-1');
    await api.plans.reopen('plan-1');
    expect(
      fetchMock.mock.calls.map((call) => new URL(String(call[0])).pathname),
    ).toEqual([
      '/plans/plan-1/participants',
      '/plans/plan-1/participants/user-2',
      '/plans/plan-1/complete',
      '/plans/plan-1/reopen',
    ]);
  });
});
