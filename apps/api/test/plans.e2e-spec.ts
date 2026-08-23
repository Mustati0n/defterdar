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
