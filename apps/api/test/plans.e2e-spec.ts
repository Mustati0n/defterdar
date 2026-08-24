import {
  execFileSync,
  spawn,
  type ChildProcessWithoutNullStreams,
} from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';
import { config } from 'dotenv';
import pg from 'pg';
import request from 'supertest';

const API_PORT = 3103;
const API_URL = `http://127.0.0.1:${API_PORT}`;
const TEST_SCHEMA = 'plan_e2e';
const TEST_PASSWORD = 'a deterministic plan test passphrase';

interface Identity {
  accessToken: string;
  id: string;
  personalLedgerId: string;
}

interface AuthenticatedApi {
  delete(path: string): request.Test;
  get(path: string): request.Test;
  patch(path: string): request.Test;
  post(path: string): request.Test;
}

describe('Plan lifecycle and participant API', () => {
  let apiProcess: ChildProcessWithoutNullStreams;
  let database: pg.Client;
  let testDatabaseUrl: string;
  let sourceLedgerId: string;
  let targetLedgerId: string;
  const users = new Map<string, Identity>();

  beforeAll(async () => {
    config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });
    testDatabaseUrl = safeTestDatabaseUrl();
    database = new pg.Client({ connectionString: testDatabaseUrl });
    await database.connect();
    await database.query(`DROP SCHEMA IF EXISTS "${TEST_SCHEMA}" CASCADE`);
    await database.query(`CREATE SCHEMA "${TEST_SCHEMA}"`);
    execFileSync('pnpm', ['prisma:deploy'], {
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env, DATABASE_URL: testDatabaseUrl },
      stdio: 'pipe',
    });
    apiProcess = spawn(process.execPath, ['dist/main.js'], {
      cwd: path.resolve(__dirname, '..'),
      env: {
        ...process.env,
        API_PORT: String(API_PORT),
        AUTH_REFRESH_TTL: '3600',
        CORS_ORIGINS: 'http://localhost:3000',
        DATABASE_URL: testDatabaseUrl,
        DEFAULT_CURRENCY: 'TRY',
        INVITATION_TTL_DAYS: '7',
        JWT_ACCESS_SECRET:
          'test-only-access-secret-with-at-least-32-characters',
        JWT_ACCESS_TTL: '900',
        NODE_ENV: 'test',
      },
      stdio: 'pipe',
    });
    await waitForApi(apiProcess);

    for (const name of [
      'owner',
      'admin',
      'member',
      'other-member',
      'outsider',
    ]) {
      users.set(name, await register(name));
    }
    sourceLedgerId = await createLedger('owner', 'Kaynak Defter');
    targetLedgerId = await createLedger('owner', 'Hedef Defter');
    for (const name of ['admin', 'member', 'other-member'])
      await inviteTo(sourceLedgerId, name);
    for (const name of ['admin', 'member'])
      await inviteTo(targetLedgerId, name);
    const promoted = await api('owner')
      .patch(`/ledgers/${sourceLedgerId}/members/${identity('admin').id}`)
      .send({ role: 'ADMIN' });
    expect(promoted.status).toBe(200);
  }, 90_000);

  afterAll(async () => {
    if (apiProcess?.exitCode === null) {
      apiProcess.kill('SIGTERM');
      await waitForExit(apiProcess);
    }
    if (database) {
      await database.query(`DROP SCHEMA IF EXISTS "${TEST_SCHEMA}" CASCADE`);
      await database.end();
    }
  });

  it('allows OWNER, ADMIN, and MEMBER creation; creator is automatically a participant', async () => {
    const ownerPlan = await createPlan('owner', sourceLedgerId, 'Owner Plan');
    const adminPlan = await createPlan('admin', sourceLedgerId, 'Admin Plan');
    const memberPlan = await createPlan(
      'member',
      sourceLedgerId,
      'Member Plan',
    );
    const participants = await api('member').get(
      `/plans/${memberPlan}/participants`,
    );
    const outsider = await api('outsider')
      .post(`/ledgers/${sourceLedgerId}/plans`)
      .send({ name: 'Gizli' });

    expect(ownerPlan).toBeTruthy();
    expect(adminPlan).toBeTruthy();
    expect(participants.status).toBe(200);
    expect(participants.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          user: expect.objectContaining({ id: identity('member').id }),
        }),
      ]),
    );
    expect(outsider.status).toBe(404);
  });

  it('lists and reads plans for members but returns 404 to non-members', async () => {
    const planId = await createPlan(
      'owner',
      sourceLedgerId,
      'Görülebilen Plan',
    );
    expect(
      (await api('member').get(`/ledgers/${sourceLedgerId}/plans`)).status,
    ).toBe(200);
    expect((await api('member').get(`/plans/${planId}`)).status).toBe(200);
    expect((await api('outsider').get(`/plans/${planId}`)).status).toBe(404);
    expect(
      (await api('outsider').get('/plans/11111111-1111-4111-8111-111111111111'))
        .status,
    ).toBe(404);
  });

  it('enforces update policy and validates the final date range', async () => {
    const memberPlan = await createPlan(
      'member',
      sourceLedgerId,
      'Member Metadata',
      {
        startsAt: '2026-09-05T07:00:00.000Z',
        endsAt: '2026-09-06T22:00:00.000Z',
      },
    );
    const own = await api('member')
      .patch(`/plans/${memberPlan}`)
      .send({ name: '  Güncel Plan  ' });
    const owner = await api('owner')
      .patch(`/plans/${memberPlan}`)
      .send({ description: 'Owner edit' });
    const admin = await api('admin')
      .patch(`/plans/${memberPlan}`)
      .send({ description: 'Admin edit' });
    const other = await api('other-member')
      .patch(`/plans/${memberPlan}`)
      .send({ name: 'Hayır' });
    const invalidCreate = await api('owner')
      .post(`/ledgers/${sourceLedgerId}/plans`)
      .send({
        name: 'Geçersiz tarih',
        startsAt: '2026-09-06T00:00:00.000Z',
        endsAt: '2026-09-05T00:00:00.000Z',
      });
    const invalidPatch = await api('member')
      .patch(`/plans/${memberPlan}`)
      .send({ endsAt: '2026-09-04T00:00:00.000Z' });

    expect(own.status).toBe(200);
    expect(own.body.name).toBe('Güncel Plan');
    expect(owner.status).toBe(200);
    expect(admin.status).toBe(200);
    expect(other.status).toBe(403);
    expect(invalidCreate.status).toBe(400);
    expect(invalidPatch.status).toBe(400);
  });

  it('runs the canonical ACTIVE, COMPLETED, ARCHIVED lifecycle with role rules', async () => {
    const memberPlan = await createPlan('member', sourceLedgerId, 'Lifecycle');
    expect(
      (await api('member').post(`/plans/${memberPlan}/complete`)).status,
    ).toBe(201);
    expect(
      (await api('member').post(`/plans/${memberPlan}/complete`)).status,
    ).toBe(201);
    expect(
      (await api('member').post(`/plans/${memberPlan}/reopen`)).status,
    ).toBe(403);
    expect(
      (await api('admin').post(`/plans/${memberPlan}/reopen`)).status,
    ).toBe(201);
    expect(
      (await api('admin').post(`/plans/${memberPlan}/archive`)).status,
    ).toBe(201);
    expect(
      (
        await api('member')
          .patch(`/plans/${memberPlan}`)
          .send({ name: 'Kapalı' })
      ).status,
    ).toBe(409);
    expect(
      (
        await api('member')
          .post(`/plans/${memberPlan}/participants`)
          .send({ userId: identity('other-member').id })
      ).status,
    ).toBe(409);
    const unarchived = await api('admin').post(
      `/plans/${memberPlan}/unarchive`,
    );
    expect(unarchived.status).toBe(201);
    expect(unarchived.body.status).toBe('ACTIVE');
    expect(unarchived.body.archivedAt).toBeNull();
  });

  it('manages only active ledger members as participants with creator-member policy', async () => {
    const planId = await createPlan(
      'member',
      sourceLedgerId,
      'Katılımcı Planı',
    );
    const byCreator = await api('member')
      .post(`/plans/${planId}/participants`)
      .send({ userId: identity('other-member').id });
    const duplicate = await api('member')
      .post(`/plans/${planId}/participants`)
      .send({ userId: identity('other-member').id });
    const nonMember = await api('member')
      .post(`/plans/${planId}/participants`)
      .send({ userId: identity('outsider').id });
    const byOther = await api('other-member')
      .post(`/plans/${planId}/participants`)
      .send({ userId: identity('admin').id });
    const remove = await api('member').delete(
      `/plans/${planId}/participants/${identity('member').id}`,
    );

    expect(byCreator.status).toBe(201);
    expect(duplicate.status).toBe(409);
    expect(nonMember.status).toBe(400);
    expect(byOther.status).toBe(403);
    expect(remove.status).toBe(204);
  });

  it('allows OWNER and ADMIN participant management', async () => {
    const planId = await createPlan(
      'owner',
      sourceLedgerId,
      'Yönetilen Katılımcılar',
    );
    const byAdmin = await api('admin')
      .post(`/plans/${planId}/participants`)
      .send({ userId: identity('member').id });
    const byOwner = await api('owner')
      .post(`/plans/${planId}/participants`)
      .send({ userId: identity('other-member').id });
    const removeByAdmin = await api('admin').delete(
      `/plans/${planId}/participants/${identity('other-member').id}`,
    );

    expect(byAdmin.status).toBe(201);
    expect(byOwner.status).toBe(201);
    expect(removeByAdmin.status).toBe(204);
  });

  it('allows OWNER to move compatible participants and rejects incompatible moves atomically', async () => {
    const compatible = await createPlan('owner', sourceLedgerId, 'Taşınabilir');
    expect(
      (
        await api('owner')
          .post(`/plans/${compatible}/participants`)
          .send({ userId: identity('admin').id })
      ).status,
    ).toBe(201);
    const moved = await api('owner')
      .post(`/plans/${compatible}/move`)
      .send({ targetLedgerId });
    expect(moved.status).toBe(201);
    expect(moved.body.ledgerId).toBe(targetLedgerId);

    const incompatible = await createPlan('owner', sourceLedgerId, 'Uyumsuz');
    expect(
      (
        await api('owner')
          .post(`/plans/${incompatible}/participants`)
          .send({ userId: identity('other-member').id })
      ).status,
    ).toBe(201);
    const rejected = await api('owner')
      .post(`/plans/${incompatible}/move`)
      .send({ targetLedgerId });
    expect(rejected.status).toBe(409);
    expect(
      (await api('owner').get(`/plans/${incompatible}`)).body.ledgerId,
    ).toBe(sourceLedgerId);
  });

  it('enforces move access, same-ledger, and archived-ledger rules', async () => {
    const planId = await createPlan('owner', sourceLedgerId, 'Taşıma Yetkisi');
    expect(
      (
        await api('admin')
          .post(`/plans/${planId}/move`)
          .send({ targetLedgerId })
      ).status,
    ).toBe(403);
    expect(
      (
        await api('owner')
          .post(`/plans/${planId}/move`)
          .send({ targetLedgerId: sourceLedgerId })
      ).status,
    ).toBe(400);
    const personalPlan = await createPlan(
      'owner',
      identity('owner').personalLedgerId,
      'Kişisel Taşıma',
    );
    expect(
      (
        await api('owner')
          .post(`/plans/${personalPlan}/move`)
          .send({ targetLedgerId })
      ).status,
    ).toBe(201);
    const inaccessibleTargetId = await createLedger(
      'admin',
      'Erişilemeyen Hedef',
    );
    expect(
      (
        await api('owner')
          .post(`/plans/${planId}/move`)
          .send({ targetLedgerId: inaccessibleTargetId })
      ).status,
    ).toBe(403);
    expect(
      (await api('owner').post(`/ledgers/${targetLedgerId}/archive`)).status,
    ).toBe(201);
    expect(
      (
        await api('owner')
          .post(`/ledgers/${targetLedgerId}/plans`)
          .send({ name: 'Arşivde Oluşmaz' })
      ).status,
    ).toBe(409);
    const blocked = await api('owner')
      .post(`/plans/${planId}/move`)
      .send({ targetLedgerId });
    expect(blocked.status).toBe(409);
    expect(
      (await api('owner').post(`/ledgers/${targetLedgerId}/unarchive`)).status,
    ).toBe(201);
    expect(
      (await api('owner').post(`/ledgers/${sourceLedgerId}/archive`)).status,
    ).toBe(201);
    expect(
      (
        await api('owner')
          .post(`/plans/${planId}/move`)
          .send({ targetLedgerId })
      ).status,
    ).toBe(409);
    expect(
      (await api('owner').post(`/ledgers/${sourceLedgerId}/unarchive`)).status,
    ).toBe(201);
  });

  it('creates, updates, lists, and voids ledger expenses with authorization', async () => {
    const splitUsers = [
      identity('owner').id,
      identity('admin').id,
      identity('member').id,
    ];
    const created = await api('member')
      .post(`/ledgers/${sourceLedgerId}/expenses`)
      .send({
        title: 'Market',
        amountMinor: 60_000,
        payerUserId: identity('owner').id,
        expenseDate: '2026-08-23T10:00:00.000Z',
        isGift: false,
        split: { method: 'EQUAL', participantUserIds: splitUsers },
      });
    expect(created.status).toBe(201);
    expect(created.body.currency).toBe('TRY');
    expect(
      created.body.splits.reduce(
        (total: number, split: { amountMinor: string }) =>
          total + Number(split.amountMinor),
        0,
      ),
    ).toBe(60_000);
    const expenseId = created.body.id as string;
    expect((await api('outsider').get(`/expenses/${expenseId}`)).status).toBe(
      404,
    );
    expect(
      (
        await api('other-member')
          .patch(`/expenses/${expenseId}`)
          .send({ title: 'No', expectedVersion: 1 })
      ).status,
    ).toBe(403);
    expect(
      (
        await api('member')
          .patch(`/expenses/${expenseId}`)
          .send({ isGift: true, expectedVersion: 1 })
      ).status,
    ).toBe(200);
    const gift = await api('member').get(`/expenses/${expenseId}`);
    expect(
      gift.body.splits.every(
        (split: { isReimbursable: boolean }) => !split.isReimbursable,
      ),
    ).toBe(true);
    const invalid = await api('member')
      .patch(`/expenses/${expenseId}`)
      .send({ amountMinor: 10_000, expectedVersion: 2 });
    expect(invalid.status).toBe(400);
    expect(
      (await api('member').get(`/expenses/${expenseId}`)).body.amountMinor,
    ).toBe('60000');
    expect(
      (await api('owner').get(`/ledgers/${sourceLedgerId}/expenses`)).status,
    ).toBe(200);
    expect(
      (await api('admin').post(`/expenses/${expenseId}/void`)).status,
    ).toBe(201);
    expect(
      (await api('admin').post(`/expenses/${expenseId}/void`)).status,
    ).toBe(201);
    expect(
      (
        await api('member')
          .patch(`/expenses/${expenseId}`)
          .send({ title: 'Void', expectedVersion: 2 })
      ).status,
    ).toBe(409);
  });

  it('projects isolated Plan and aggregate Ledger balances with suggestions', async () => {
    const planId = await createPlan('owner', sourceLedgerId, 'Balance Planı');
    expect(
      (
        await api('owner')
          .post(`/plans/${planId}/participants`)
          .send({ userId: identity('admin').id })
      ).status,
    ).toBe(201);
    const created = await api('owner')
      .post(`/ledgers/${sourceLedgerId}/expenses`)
      .send({
        title: 'Plan borcu',
        amountMinor: 30_000,
        payerUserId: identity('owner').id,
        planId,
        expenseDate: '2026-08-23T12:00:00.000Z',
        isGift: false,
        split: {
          method: 'EXACT',
          entries: [{ userId: identity('admin').id, amountMinor: 30_000 }],
        },
      });
    expect(created.status).toBe(201);
    const planBalance = await api('admin').get(`/plans/${planId}/balances`);
    expect(planBalance.status).toBe(200);
    expect(planBalance.body.positions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          user: expect.objectContaining({ id: identity('owner').id }),
          netMinor: 30_000,
        }),
        expect.objectContaining({
          user: expect.objectContaining({ id: identity('admin').id }),
          netMinor: -30_000,
        }),
      ]),
    );
    expect(planBalance.body.suggestions).toEqual([
      {
        fromUserId: identity('admin').id,
        toUserId: identity('owner').id,
        amountMinor: 30_000,
      },
    ]);
    const ledgerBalance = await api('member').get(
      `/ledgers/${sourceLedgerId}/balances`,
    );
    expect(ledgerBalance.status).toBe(200);
    expect(
      (await api('outsider').get(`/ledgers/${sourceLedgerId}/balances`)).status,
    ).toBe(404);
    expect(
      (await api('outsider').get(`/plans/${planId}/balances`)).status,
    ).toBe(404);
  });

  it('records partial/full settlements, rejects overpayment, and voids safely', async () => {
    const ledgerId = await createLedger('owner', 'Settlement Defteri');
    await inviteTo(ledgerId, 'admin');
    await inviteTo(ledgerId, 'member');
    const expense = await api('owner')
      .post(`/ledgers/${ledgerId}/expenses`)
      .send({
        title: 'Settlement debt',
        amountMinor: 10_000,
        payerUserId: identity('owner').id,
        expenseDate: '2026-08-23T13:00:00.000Z',
        isGift: false,
        split: {
          method: 'EXACT',
          entries: [{ userId: identity('admin').id, amountMinor: 10_000 }],
        },
      });
    expect(expense.status).toBe(201);
    const unauthorized = await api('member')
      .post(`/ledgers/${ledgerId}/settlements`)
      .send({
        fromUserId: identity('admin').id,
        toUserId: identity('owner').id,
        amountMinor: 1_000,
        settledAt: '2026-08-23T14:00:00.000Z',
      });
    expect(unauthorized.status).toBe(403);
    const partial = await api('admin')
      .post(`/ledgers/${ledgerId}/settlements`)
      .send({
        fromUserId: identity('admin').id,
        toUserId: identity('owner').id,
        amountMinor: 4_000,
        settledAt: '2026-08-23T14:00:00.000Z',
      });
    expect(partial.status).toBe(201);
    expect(partial.body.currency).toBe('TRY');
    const afterPartial = await api('owner').get(`/ledgers/${ledgerId}/balances`);
    expect(afterPartial.body.suggestions[0].amountMinor).toBe(6_000);
    expect(
      (
        await api('admin')
          .post(`/ledgers/${ledgerId}/settlements`)
          .send({
            fromUserId: identity('admin').id,
            toUserId: identity('owner').id,
            amountMinor: 6_001,
            settledAt: '2026-08-23T15:00:00.000Z',
          })
      ).status,
    ).toBe(409);
    const full = await api('owner')
      .post(`/ledgers/${ledgerId}/settlements`)
      .send({
        fromUserId: identity('admin').id,
        toUserId: identity('owner').id,
        amountMinor: 6_000,
        settledAt: '2026-08-23T15:00:00.000Z',
      });
    expect(full.status).toBe(201);
    expect((await api('owner').get(`/ledgers/${ledgerId}/balances`)).body.positions).toEqual([]);
    expect((await api('owner').post(`/settlements/${full.body.id}/void`)).status).toBe(201);
    expect((await api('owner').post(`/settlements/${full.body.id}/void`)).status).toBe(201);
    expect((await api('owner').get(`/ledgers/${ledgerId}/balances`)).body.suggestions[0].amountMinor).toBe(6_000);
    expect((await api('outsider').get(`/settlements/${partial.body.id}`)).status).toBe(404);
  });

  it('serializes concurrent settlements so accepted payments never overpay', async () => {
    const ledgerId = await createLedger('owner', 'Settlement Yarışı');
    await inviteTo(ledgerId, 'admin');
    expect(
      (
        await api('owner')
          .post(`/ledgers/${ledgerId}/expenses`)
          .send({
            title: 'Concurrent debt',
            amountMinor: 10_000,
            payerUserId: identity('owner').id,
            expenseDate: '2026-08-23T13:00:00.000Z',
            isGift: false,
            split: { method: 'EXACT', entries: [{ userId: identity('admin').id, amountMinor: 10_000 }] },
          })
      ).status,
    ).toBe(201);
    const payload = {
      fromUserId: identity('admin').id,
      toUserId: identity('owner').id,
      amountMinor: 8_000,
      settledAt: '2026-08-23T16:00:00.000Z',
    };
    const results = await Promise.all([
      api('admin').post(`/ledgers/${ledgerId}/settlements`).send(payload),
      api('admin').post(`/ledgers/${ledgerId}/settlements`).send(payload),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
    const list = await api('owner').get(`/ledgers/${ledgerId}/settlements`);
    expect(list.body.filter((item: { voidedAt: string | null }) => !item.voidedAt)).toHaveLength(1);
  });

  it('allows scoped settlements on completed plans but rejects archived plans', async () => {
    const ledgerId = await createLedger('owner', 'Plan Settlement Defteri');
    await inviteTo(ledgerId, 'admin');
    const planId = await createPlan('owner', ledgerId, 'Completed Settlement Plan');
    expect(
      (
        await api('owner')
          .post(`/plans/${planId}/participants`)
          .send({ userId: identity('admin').id })
      ).status,
    ).toBe(201);
    expect(
      (
        await api('owner')
          .post(`/ledgers/${ledgerId}/expenses`)
          .send({
            title: 'Plan debt',
            amountMinor: 5_000,
            payerUserId: identity('owner').id,
            planId,
            expenseDate: '2026-08-23T13:00:00.000Z',
            isGift: false,
            split: { method: 'EXACT', entries: [{ userId: identity('admin').id, amountMinor: 5_000 }] },
          })
      ).status,
    ).toBe(201);
    expect((await api('owner').post(`/plans/${planId}/complete`)).status).toBe(201);
    const settled = await api('admin')
      .post(`/ledgers/${ledgerId}/settlements`)
      .send({
        planId,
        fromUserId: identity('admin').id,
        toUserId: identity('owner').id,
        amountMinor: 5_000,
        settledAt: '2026-08-23T15:00:00.000Z',
      });
    expect(settled.status).toBe(201);
    expect((await api('owner').get(`/plans/${planId}/balances`)).body.positions).toEqual([]);
    expect((await api('owner').get(`/ledgers/${ledgerId}/settlements?planId=${planId}`)).body).toHaveLength(1);
    expect((await api('owner').post(`/plans/${planId}/archive`)).status).toBe(201);
    expect(
      (
        await api('admin')
          .post(`/ledgers/${ledgerId}/settlements`)
          .send({
            planId,
            fromUserId: identity('admin').id,
            toUserId: identity('owner').id,
            amountMinor: 1,
            settledAt: '2026-08-23T16:00:00.000Z',
          })
      ).status,
    ).toBe(409);
  });

  it('tracks Borçtan düş metadata without double-counting and protects expense finance', async () => {
    const ledgerId = await createLedger('owner', 'Offset Defteri');
    await inviteTo(ledgerId, 'admin');
    expect(
      (
        await api('admin')
          .post(`/ledgers/${ledgerId}/expenses`)
          .send({
            title: 'Prior reverse debt',
            amountMinor: 10_000,
            payerUserId: identity('admin').id,
            expenseDate: '2026-08-23T10:00:00.000Z',
            isGift: false,
            split: { method: 'EXACT', entries: [{ userId: identity('owner').id, amountMinor: 10_000 }] },
          })
      ).status,
    ).toBe(201);
    const target = await api('owner')
      .post(`/ledgers/${ledgerId}/expenses`)
      .send({
        title: 'Target expense',
        amountMinor: 8_000,
        payerUserId: identity('owner').id,
        expenseDate: '2026-08-23T11:00:00.000Z',
        isGift: false,
        split: { method: 'EXACT', entries: [{ userId: identity('admin').id, amountMinor: 8_000 }] },
      });
    expect(target.status).toBe(201);
    const splitId = target.body.splits[0].id as string;
    const before = (await api('owner').get(`/ledgers/${ledgerId}/balances`)).body;
    const availability = await api('owner').get(`/expense-splits/${splitId}/offset-availability`);
    expect(availability.status).toBe(200);
    expect(availability.body.maxOffsetMinor).toBe('8000');
    const concurrent = await Promise.all([
      api('owner').post(`/expense-splits/${splitId}/offsets`).send({ amountMinor: 6_000 }),
      api('owner').post(`/expense-splits/${splitId}/offsets`).send({ amountMinor: 6_000 }),
    ]);
    expect(concurrent.map((result) => result.status).sort()).toEqual([201, 409]);
    const active = concurrent.find((result) => result.status === 201)!;
    const activeHistory = await api('owner').get(`/expenses/${target.body.id}`);
    expect(activeHistory.body.splits[0]).toMatchObject({
      offsetAppliedMinor: '6000',
      remainingReimbursableMinor: '2000',
      offsets: [
        expect.objectContaining({
          id: active.body.id,
          amountMinor: '6000',
          voidedAt: null,
        }),
      ],
    });
    const after = (await api('owner').get(`/ledgers/${ledgerId}/balances`)).body;
    expect(after).toEqual(before);
    expect(
      (
        await api('owner')
          .patch(`/expenses/${target.body.id}`)
          .send({ expectedVersion: 1, amountMinor: 9_000, split: { method: 'EXACT', entries: [{ userId: identity('admin').id, amountMinor: 9_000 }] } })
      ).status,
    ).toBe(409);
    expect((await api('owner').patch(`/expenses/${target.body.id}`).send({ title: 'Metadata ok', expectedVersion: 1 })).status).toBe(200);
    expect((await api('admin').post(`/expense-split-offsets/${active.body.id}/void`)).status).toBe(403);
    expect((await api('owner').post(`/expense-split-offsets/${active.body.id}/void`)).status).toBe(201);
    const voidedHistory = await api('owner').get(`/expenses/${target.body.id}`);
    expect(voidedHistory.body.splits[0].offsetAppliedMinor).toBe('0');
    expect(voidedHistory.body.splits[0].offsets[0]).toMatchObject({
      id: active.body.id,
      amountMinor: '6000',
    });
    expect(voidedHistory.body.splits[0].offsets[0].voidedAt).not.toBeNull();
    const reapplied = await api('owner').post(`/expense-splits/${splitId}/offsets`).send({});
    expect(reapplied.status).toBe(201);
    expect((await api('owner').post(`/expenses/${target.body.id}/void`)).status).toBe(201);
    expect((await api('owner').get(`/expenses/${target.body.id}`)).body.splits[0].remainingReimbursableMinor).toBe('0');
    expect((await api('owner').post(`/expense-split-offsets/${reapplied.body.id}/void`)).status).toBe(201);
  });

  it('manages ledger categories and tracks Income without changing Balance', async () => {
    const incomeCategory = await api('owner')
      .post(`/ledgers/${sourceLedgerId}/categories`)
      .send({ name: ' Maaş ', kind: 'INCOME' });
    expect(incomeCategory.status).toBe(201);
    expect(incomeCategory.body.name).toBe('Maaş');
    expect(
      (
        await api('owner')
          .post(`/ledgers/${sourceLedgerId}/categories`)
          .send({ name: 'maaŞ', kind: 'BOTH' })
      ).status,
    ).toBe(409);
    expect(
      (
        await api('member')
          .post(`/ledgers/${sourceLedgerId}/categories`)
          .send({ name: 'Forbidden', kind: 'BOTH' })
      ).status,
    ).toBe(403);

    const before = (await api('member').get(`/ledgers/${sourceLedgerId}/balances`)).body;
    const income = await api('member')
      .post(`/ledgers/${sourceLedgerId}/incomes`)
      .send({
        title: ' Salary ',
        amountMinor: 125_000,
        categoryId: incomeCategory.body.id,
        incomeDate: '2026-08-23T09:00:00.000Z',
      });
    expect(income.status).toBe(201);
    expect(income.body.title).toBe('Salary');
    expect(income.body.currency).toBe('TRY');
    expect((await api('member').get(`/ledgers/${sourceLedgerId}/balances`)).body).toEqual(before);
    expect((await api('outsider').get(`/incomes/${income.body.id}`)).status).toBe(404);
    expect(
      (
        await api('other-member')
          .patch(`/incomes/${income.body.id}`)
          .send({ title: 'No' })
      ).status,
    ).toBe(403);
    expect(
      (
        await api('admin')
          .patch(`/incomes/${income.body.id}`)
          .send({ amountMinor: 130_000 })
      ).status,
    ).toBe(200);
    expect((await api('member').post(`/incomes/${income.body.id}/void`)).status).toBe(201);
    expect((await api('member').post(`/incomes/${income.body.id}/void`)).status).toBe(201);

    expect((await api('owner').post(`/categories/${incomeCategory.body.id}/archive`)).status).toBe(201);
    expect(
      (
        await api('owner')
          .post(`/ledgers/${sourceLedgerId}/incomes`)
          .send({
            title: 'Archived category',
            amountMinor: 1_000,
            categoryId: incomeCategory.body.id,
            incomeDate: '2026-08-23T09:00:00.000Z',
          })
      ).status,
    ).toBe(400);

    const personalCategory = await api('owner')
      .post(`/ledgers/${identity('owner').personalLedgerId}/categories`)
      .send({ name: 'Personal both', kind: 'BOTH' });
    expect(personalCategory.status).toBe(201);
    expect(
      (
        await api('owner')
          .post(`/ledgers/${identity('owner').personalLedgerId}/incomes`)
          .send({
            title: 'Personal income',
            amountMinor: 2_000,
            categoryId: personalCategory.body.id,
            incomeDate: '2026-08-23T09:00:00.000Z',
          })
      ).status,
    ).toBe(201);
  });

  it('validates Expense category kind and completed Plan Income constraints', async () => {
    const expenseCategory = await api('admin')
      .post(`/ledgers/${sourceLedgerId}/categories`)
      .send({ name: 'Market Category', kind: 'EXPENSE' });
    expect(expenseCategory.status).toBe(201);
    const expense = await api('member')
      .post(`/ledgers/${sourceLedgerId}/expenses`)
      .send({
        title: 'Categorized expense',
        amountMinor: 1_000,
        payerUserId: identity('member').id,
        categoryId: expenseCategory.body.id,
        expenseDate: '2026-08-23T10:00:00.000Z',
        isGift: false,
        split: { method: 'EXACT', entries: [{ userId: identity('member').id, amountMinor: 1_000 }] },
      });
    expect(expense.status).toBe(201);
    expect(expense.body.category.id).toBe(expenseCategory.body.id);
    const planId = await createPlan('member', sourceLedgerId, 'Income lifecycle');
    expect((await api('member').post(`/plans/${planId}/complete`)).status).toBe(201);
    expect(
      (
        await api('member')
          .post(`/ledgers/${sourceLedgerId}/incomes`)
          .send({
            title: 'Completed Plan income',
            amountMinor: 1_000,
            planId,
            incomeDate: '2026-08-23T10:00:00.000Z',
          })
      ).status,
    ).toBe(400);
  });

  it('runs presigned receipt lifecycle and enforces the concurrent five-image limit', async () => {
    const expense = await api('member')
      .post(`/ledgers/${sourceLedgerId}/expenses`)
      .send({
        title: 'Receipt target',
        amountMinor: 5_000,
        payerUserId: identity('member').id,
        expenseDate: '2026-08-23T10:00:00.000Z',
        isGift: false,
        split: { method: 'EXACT', entries: [{ userId: identity('member').id, amountMinor: 5_000 }] },
      });
    expect(expense.status).toBe(201);
    const path = `/expenses/${expense.body.id}/attachments`;
    const payload = { fileName: '../receipt.webp', mimeType: 'image/webp', sizeBytes: 1_024 };
    expect((await api('other-member').post(path).send(payload)).status).toBe(403);
    expect((await api('member').post(path).send({ ...payload, mimeType: 'image/gif' })).status).toBe(400);
    expect((await api('member').post(path).send({ ...payload, sizeBytes: 10 * 1024 * 1024 + 1 })).status).toBe(400);

    const uploads = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        api('member').post(path).send({ ...payload, fileName: `receipt-${index}.webp` }),
      ),
    );
    expect(uploads.every((upload) => upload.status === 201)).toBe(true);
    expect(uploads[0]!.body.uploadUrl).toMatch(/^memory:\/\/upload\//);
    expect((await api('member').post(path).send(payload)).status).toBe(409);
    const attachmentId = uploads[0]!.body.attachmentId as string;
    const completed = await api('member').post(`/attachments/${attachmentId}/complete`);
    expect(completed.status).toBe(201);
    expect(completed.body.status).toBe('READY');
    expect((await api('other-member').get(`/attachments/${attachmentId}/url`)).status).toBe(200);
    expect((await api('outsider').get(`/attachments/${attachmentId}/url`)).status).toBe(404);
    expect((await api('owner').delete(`/attachments/${attachmentId}`)).status).toBe(204);
    expect((await api('member').post(path).send(payload)).status).toBe(201);
    expect((await api('member').post(`/expenses/${expense.body.id}/void`)).status).toBe(201);
    expect((await api('member').post(path).send(payload)).status).toBe(409);
  });

  it('serves immutable cursor-paginated activity without leaking secrets', async () => {
    const first = await api('member').get(`/ledgers/${sourceLedgerId}/activity?limit=2`);
    expect(first.status).toBe(200);
    expect(first.body.items).toHaveLength(2);
    expect(first.body.nextCursor).toBeTruthy();
    const second = await api('member').get(
      `/ledgers/${sourceLedgerId}/activity?limit=2&cursor=${first.body.nextCursor}`,
    );
    expect(second.status).toBe(200);
    expect(second.body.items[0]?.id).not.toBe(first.body.items[0]?.id);
    expect(JSON.stringify(first.body)).not.toMatch(/passwordHash|refreshTokenHash|tokenHash|storageKey/i);
    expect((await api('outsider').get(`/ledgers/${sourceLedgerId}/activity`)).status).toBe(404);

    const actions = (
      await api('owner').get(`/ledgers/${sourceLedgerId}/activity?limit=100`)
    ).body.items.map((item: { action: string }) => item.action);
    expect(actions).toEqual(
      expect.arrayContaining([
        'expense.created',
        'income.created',
        'category.created',
        'attachment.added',
      ]),
    );
    const activityId = first.body.items[0].id as string;
    await expect(
      database.query(`UPDATE "${TEST_SCHEMA}"."ActivityLog" SET "action" = $1 WHERE "id" = $2`, [
        'tampered',
        activityId,
      ]),
    ).rejects.toThrow(/immutable/);

    const archivedLedger = await createLedger('owner', 'Archived activity');
    expect((await api('owner').post(`/ledgers/${archivedLedger}/archive`)).status).toBe(201);
    expect((await api('owner').get(`/ledgers/${archivedLedger}/activity`)).status).toBe(200);
  });

  it('filters Plan activity without leaking unrelated Ledger events and preserves pagination', async () => {
    const planId = await createPlan(
      'owner',
      sourceLedgerId,
      'Activity scope Plan',
    );
    const planExpense = await api('owner')
      .post(`/ledgers/${sourceLedgerId}/expenses`)
      .send({
        title: 'Plan-scoped activity expense',
        amountMinor: 2_000,
        payerUserId: identity('owner').id,
        planId,
        expenseDate: '2026-08-23T10:00:00.000Z',
        isGift: false,
        split: {
          method: 'EXACT',
          entries: [
            { userId: identity('owner').id, amountMinor: 2_000 },
          ],
        },
      });
    expect(planExpense.status).toBe(201);
    const unrelatedExpense = await api('owner')
      .post(`/ledgers/${sourceLedgerId}/expenses`)
      .send({
        title: 'Ledger-only activity expense',
        amountMinor: 1_000,
        payerUserId: identity('owner').id,
        expenseDate: '2026-08-23T11:00:00.000Z',
        isGift: false,
        split: {
          method: 'EXACT',
          entries: [
            { userId: identity('owner').id, amountMinor: 1_000 },
          ],
        },
      });
    expect(unrelatedExpense.status).toBe(201);

    const first = await api('owner').get(
      `/ledgers/${sourceLedgerId}/activity?planId=${planId}&limit=1`,
    );
    expect(first.status).toBe(200);
    expect(first.body.items).toHaveLength(1);
    expect(first.body.items[0].entityId).toBe(planExpense.body.id);
    expect(first.body.items[0].entityId).not.toBe(unrelatedExpense.body.id);
    expect(first.body.nextCursor).toBeTruthy();

    const second = await api('owner').get(
      `/ledgers/${sourceLedgerId}/activity?planId=${planId}&limit=1&cursor=${first.body.nextCursor}`,
    );
    expect(second.status).toBe(200);
    expect(second.body.items).toHaveLength(1);
    expect(second.body.items[0].entityType).toBe('Plan');
    expect(second.body.items[0].entityId).toBe(planId);
    expect(
      (
        await api('outsider').get(
          `/ledgers/${sourceLedgerId}/activity?planId=${planId}`,
        )
      ).status,
    ).toBe(404);
  });

  it('deduplicates financial retries and rejects stale Expense versions', async () => {
    const ledgerId = await createLedger('owner', 'Idempotency Defteri');
    await inviteTo(ledgerId, 'admin');
    const expensePayload = {
      title: 'Retry-safe expense',
      amountMinor: 10_000,
      payerUserId: identity('owner').id,
      expenseDate: '2026-08-23T10:00:00.000Z',
      isGift: false,
      split: { method: 'EXACT', entries: [{ userId: identity('admin').id, amountMinor: 10_000 }] },
    };
    const expenseKey = 'concurrent-expense-key';
    const duplicateExpenses = await Promise.all([
      api('owner').post(`/ledgers/${ledgerId}/expenses`).set('Idempotency-Key', expenseKey).send(expensePayload),
      api('owner').post(`/ledgers/${ledgerId}/expenses`).set('Idempotency-Key', expenseKey).send(expensePayload),
    ]);
    expect(duplicateExpenses.map((result) => result.status)).toEqual([201, 201]);
    expect(duplicateExpenses[0]!.body.id).toBe(duplicateExpenses[1]!.body.id);
    expect((await api('owner').get(`/ledgers/${ledgerId}/expenses`)).body).toHaveLength(1);
    expect(
      (
        await api('owner')
          .post(`/ledgers/${ledgerId}/expenses`)
          .set('Idempotency-Key', expenseKey)
          .send({ ...expensePayload, title: 'Different request' })
      ).status,
    ).toBe(409);

    const expenseId = duplicateExpenses[0]!.body.id as string;
    const updated = await api('owner')
      .patch(`/expenses/${expenseId}`)
      .send({ title: 'Version two', expectedVersion: 1 });
    expect(updated.status).toBe(200);
    expect(updated.body.version).toBe(2);
    expect(
      (
        await api('owner')
          .patch(`/expenses/${expenseId}`)
          .send({ title: 'Stale write', expectedVersion: 1 })
      ).status,
    ).toBe(409);
    expect((await api('owner').get(`/expenses/${expenseId}`)).body.title).toBe('Version two');

    const settlementPayload = {
      fromUserId: identity('admin').id,
      toUserId: identity('owner').id,
      amountMinor: 1_000,
      settledAt: '2026-08-23T11:00:00.000Z',
    };
    const firstSettlement = await api('admin')
      .post(`/ledgers/${ledgerId}/settlements`)
      .set('Idempotency-Key', 'settlement-key')
      .send(settlementPayload);
    const replayedSettlement = await api('admin')
      .post(`/ledgers/${ledgerId}/settlements`)
      .set('Idempotency-Key', 'settlement-key')
      .send(settlementPayload);
    expect(firstSettlement.status).toBe(201);
    expect(replayedSettlement.body.id).toBe(firstSettlement.body.id);
    expect((await api('owner').get(`/ledgers/${ledgerId}/settlements`)).body).toHaveLength(1);

    const prior = await api('admin')
      .post(`/ledgers/${ledgerId}/expenses`)
      .send({
        title: 'Reverse debt',
        amountMinor: 20_000,
        payerUserId: identity('admin').id,
        expenseDate: '2026-08-23T08:00:00.000Z',
        isGift: false,
        split: { method: 'EXACT', entries: [{ userId: identity('owner').id, amountMinor: 20_000 }] },
      });
    expect(prior.status).toBe(201);
    const target = await api('owner')
      .post(`/ledgers/${ledgerId}/expenses`)
      .send({
        title: 'Offset idempotency target',
        amountMinor: 5_000,
        payerUserId: identity('owner').id,
        expenseDate: '2026-08-23T12:00:00.000Z',
        isGift: false,
        split: { method: 'EXACT', entries: [{ userId: identity('admin').id, amountMinor: 5_000 }] },
      });
    const offsetPath = `/expense-splits/${target.body.splits[0].id}/offsets`;
    const firstOffset = await api('owner').post(offsetPath).set('Idempotency-Key', 'offset-key').send({ amountMinor: 2_000 });
    const replayedOffset = await api('owner').post(offsetPath).set('Idempotency-Key', 'offset-key').send({ amountMinor: 2_000 });
    expect(firstOffset.status).toBe(201);
    expect(replayedOffset.body.id).toBe(firstOffset.body.id);

    const incomePayload = { title: 'Retry income', amountMinor: 3_000, incomeDate: '2026-08-23T09:00:00.000Z' };
    const incomeOne = await api('owner').post(`/ledgers/${ledgerId}/incomes`).set('Idempotency-Key', 'income-key').send(incomePayload);
    const incomeTwo = await api('owner').post(`/ledgers/${ledgerId}/incomes`).set('Idempotency-Key', 'income-key').send(incomePayload);
    expect(incomeOne.status).toBe(201);
    expect(incomeTwo.body.id).toBe(incomeOne.body.id);
    expect((await api('owner').get(`/ledgers/${ledgerId}/incomes`)).body).toHaveLength(1);
  });

  it('derives ledger/Plan analytics with date, category, Gift, void and reconciliation rules', async () => {
    const ledgerId = await createLedger('owner', 'Analytics Defteri');
    await inviteTo(ledgerId, 'admin');
    const category = await api('owner')
      .post(`/ledgers/${ledgerId}/categories`)
      .send({ name: 'Analytics Both', kind: 'BOTH' });
    const planId = await createPlan('owner', ledgerId, 'Analytics Plan');
    expect(
      (
        await api('owner')
          .post(`/plans/${planId}/participants`)
          .send({ userId: identity('admin').id })
      ).status,
    ).toBe(201);
    const createExpense = (actor: string, body: Record<string, unknown>) =>
      api(actor).post(`/ledgers/${ledgerId}/expenses`).send({
        categoryId: category.body.id,
        expenseDate: '2026-01-10T10:00:00.000Z',
        isGift: false,
        ...body,
      });
    expect(
      (
        await createExpense('owner', {
          title: 'Plan expense',
          amountMinor: 1_000,
          payerUserId: identity('owner').id,
          planId,
          split: { method: 'EXACT', entries: [{ userId: identity('admin').id, amountMinor: 1_000 }] },
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await createExpense('owner', {
          title: 'Gift spending',
          amountMinor: 2_000,
          payerUserId: identity('owner').id,
          expenseDate: '2026-02-10T10:00:00.000Z',
          isGift: true,
          split: { method: 'EXACT', entries: [{ userId: identity('admin').id, amountMinor: 2_000 }] },
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await createExpense('admin', {
          title: 'Reverse debt',
          amountMinor: 4_000,
          payerUserId: identity('admin').id,
          split: { method: 'EXACT', entries: [{ userId: identity('owner').id, amountMinor: 4_000 }] },
        })
      ).status,
    ).toBe(201);
    const offsetTarget = await createExpense('owner', {
      title: 'Offset target',
      amountMinor: 1_000,
      payerUserId: identity('owner').id,
      expenseDate: '2026-02-15T10:00:00.000Z',
      split: { method: 'EXACT', entries: [{ userId: identity('admin').id, amountMinor: 1_000 }] },
    });
    expect(offsetTarget.status).toBe(201);
    expect(
      (
        await api('owner')
          .post(`/expense-splits/${offsetTarget.body.splits[0].id}/offsets`)
          .send({ amountMinor: 500 })
      ).status,
    ).toBe(201);
    const voidedExpense = await createExpense('owner', {
      title: 'Voided expense',
      amountMinor: 4_000,
      payerUserId: identity('owner').id,
      expenseDate: '2026-03-10T10:00:00.000Z',
      split: { method: 'EXACT', entries: [{ userId: identity('owner').id, amountMinor: 4_000 }] },
    });
    expect((await api('owner').post(`/expenses/${voidedExpense.body.id}/void`)).status).toBe(201);

    const planIncome = await api('owner').post(`/ledgers/${ledgerId}/incomes`).send({
      title: 'Plan income', amountMinor: 3_000, planId, categoryId: category.body.id,
      incomeDate: '2026-01-20T10:00:00.000Z',
    });
    expect(planIncome.status).toBe(201);
    expect(
      (
        await api('owner').post(`/ledgers/${ledgerId}/incomes`).send({
          title: 'Ledger income', amountMinor: 5_000, categoryId: category.body.id,
          incomeDate: '2026-02-20T10:00:00.000Z',
        })
      ).status,
    ).toBe(201);
    const voidedIncome = await api('owner').post(`/ledgers/${ledgerId}/incomes`).send({
      title: 'Voided income', amountMinor: 7_000, categoryId: category.body.id,
      incomeDate: '2026-03-20T10:00:00.000Z',
    });
    expect((await api('owner').post(`/incomes/${voidedIncome.body.id}/void`)).status).toBe(201);
    expect(
      (
        await api('admin').post(`/ledgers/${ledgerId}/settlements`).send({
          planId,
          fromUserId: identity('admin').id,
          toUserId: identity('owner').id,
          amountMinor: 1_000,
          settledAt: '2026-01-30T10:00:00.000Z',
        })
      ).status,
    ).toBe(201);

    const summary = await api('owner').get(`/ledgers/${ledgerId}/analytics/summary`);
    expect(summary.status).toBe(200);
    expect(summary.body).toEqual(expect.objectContaining({
      currency: 'TRY',
      totalExpenseMinor: '8000',
      totalIncomeMinor: '8000',
      netCashflowMinor: '0',
      expenseCount: 4,
      incomeCount: 2,
    }));
    expect(summary.body.byCategory).toEqual([
      expect.objectContaining({ expenseMinor: '8000', incomeMinor: '8000' }),
    ]);
    expect(summary.body.monthly).toEqual([
      { month: '2026-01', expenseMinor: '5000', incomeMinor: '3000' },
      { month: '2026-02', expenseMinor: '3000', incomeMinor: '5000' },
    ]);
    expect(summary.body.currentBalances.positions).not.toEqual([]);
    const planSummary = await api('admin').get(`/plans/${planId}/analytics/summary`);
    expect(planSummary.body.totalExpenseMinor).toBe('1000');
    expect(planSummary.body.totalIncomeMinor).toBe('3000');
    expect(planSummary.body.currentBalances.positions).toEqual([]);
    const february = await api('owner').get(
      `/ledgers/${ledgerId}/analytics/summary?from=2026-02-01T00:00:00.000Z&to=2026-02-28T23:59:59.999Z`,
    );
    expect(february.body.totalExpenseMinor).toBe('3000');
    expect(february.body.totalIncomeMinor).toBe('5000');
    expect(
      (
        await api('owner').get(
          `/ledgers/${ledgerId}/analytics/summary?from=2026-03-01T00:00:00.000Z&to=2026-02-01T00:00:00.000Z`,
        )
      ).status,
    ).toBe(400);
    expect((await api('outsider').get(`/ledgers/${ledgerId}/analytics/summary`)).status).toBe(404);
    expect((await api('owner').get(`/ledgers/${identity('owner').personalLedgerId}/analytics/summary`)).status).toBe(200);
  });

  it('exposes readiness, security headers, complete Swagger paths, and safe responses', async () => {
    const ready = await request(API_URL).get('/health/ready');
    expect(ready.status).toBe(200);
    expect(ready.headers['x-content-type-options']).toBe('nosniff');
    const openApi = await request(API_URL).get('/docs-json');
    expect(openApi.status).toBe(200);
    for (const path of [
      '/ledgers/{ledgerId}/balances',
      '/plans/{planId}/balances',
      '/ledgers/{ledgerId}/settlements',
      '/expense-splits/{expenseSplitId}/offsets',
      '/ledgers/{ledgerId}/categories',
      '/ledgers/{ledgerId}/incomes',
      '/expenses/{expenseId}/attachments',
      '/ledgers/{ledgerId}/activity',
      '/ledgers/{ledgerId}/analytics/summary',
      '/plans/{planId}/analytics/summary',
      '/health/ready',
    ]) expect(openApi.body.paths[path]).toBeDefined();
    const responses = await Promise.all([
      api('owner').get(`/ledgers/${sourceLedgerId}/expenses`),
      api('owner').get(`/ledgers/${sourceLedgerId}/settlements`),
      api('owner').get(`/ledgers/${sourceLedgerId}/incomes`),
      api('owner').get(`/ledgers/${sourceLedgerId}/categories`),
      api('owner').get(`/ledgers/${sourceLedgerId}/activity?limit=100`),
      api('owner').get(`/ledgers/${sourceLedgerId}/analytics/summary`),
    ]);
    const serialized = JSON.stringify(responses.map((response) => response.body));
    expect(serialized).not.toMatch(/passwordHash|refreshTokenHash|tokenHash|AuthSession|JWT_ACCESS_SECRET|S3_SECRET_ACCESS_KEY|storageKey/i);
  });

  async function register(name: string): Promise<Identity> {
    const response = await request(API_URL)
      .post('/auth/register')
      .send({
        displayName: name,
        email: `phase3-${name}@example.com`,
        password: TEST_PASSWORD,
      });
    expect(response.status).toBe(201);
    const ledgers = await request(API_URL)
      .get('/ledgers')
      .set('Authorization', `Bearer ${response.body.accessToken}`);
    const personal = ledgers.body.find(
      (ledger: { type: string }) => ledger.type === 'PERSONAL',
    );
    return {
      accessToken: response.body.accessToken,
      id: response.body.user.id,
      personalLedgerId: personal.id,
    };
  }

  function api(name: string): AuthenticatedApi {
    const authorization = `Bearer ${identity(name).accessToken}`;
    return {
      delete: (url) =>
        request(API_URL).delete(url).set('Authorization', authorization),
      get: (url) =>
        request(API_URL).get(url).set('Authorization', authorization),
      patch: (url) =>
        request(API_URL).patch(url).set('Authorization', authorization),
      post: (url) =>
        request(API_URL).post(url).set('Authorization', authorization),
    };
  }

  function identity(name: string): Identity {
    const user = users.get(name);
    if (!user) throw new Error(`Unknown identity: ${name}`);
    return user;
  }

  async function createLedger(actor: string, name: string): Promise<string> {
    const response = await api(actor)
      .post('/ledgers')
      .send({ currency: 'TRY', name });
    expect(response.status).toBe(201);
    return response.body.id;
  }

  async function inviteTo(ledgerId: string, name: string): Promise<void> {
    const invitation = await api('owner')
      .post(`/ledgers/${ledgerId}/invitations`)
      .send({});
    expect(invitation.status).toBe(201);
    const accepted = await api(name).post(
      `/invitations/${invitation.body.token}/accept`,
    );
    expect(accepted.status).toBe(201);
  }

  async function createPlan(
    actor: string,
    ledgerId: string,
    name: string,
    extra: Record<string, unknown> = {},
  ): Promise<string> {
    const response = await api(actor)
      .post(`/ledgers/${ledgerId}/plans`)
      .send({ name, ...extra });
    expect(response.status).toBe(201);
    return response.body.id;
  }
});

function safeTestDatabaseUrl(): string {
  const value = process.env.TEST_DATABASE_URL;
  if (!value)
    throw new Error('TEST_DATABASE_URL is required for API/e2e tests');
  const parsed = new URL(value);
  if (!['127.0.0.1', 'localhost'].includes(parsed.hostname))
    throw new Error('TEST_DATABASE_URL must be local');
  parsed.searchParams.set('schema', TEST_SCHEMA);
  return parsed.toString();
}

async function waitForApi(
  apiProcess: ChildProcessWithoutNullStreams,
): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (apiProcess.exitCode !== null)
      throw new Error('API exited before tests started');
    try {
      if ((await request(API_URL).get('/health')).status === 200) return;
    } catch {
      /* API is still starting. */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('API did not start in time');
}

async function waitForExit(
  apiProcess: ChildProcessWithoutNullStreams,
): Promise<void> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      once(apiProcess, 'exit'),
      new Promise<void>((resolve) => {
        timeout = setTimeout(resolve, 3_000);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
