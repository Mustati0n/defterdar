import {
  execFileSync,
  spawn,
  type ChildProcessWithoutNullStreams,
} from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import path from 'node:path';
import { config } from 'dotenv';
import pg from 'pg';
import request from 'supertest';

const API_PORT = 3102;
const API_URL = `http://127.0.0.1:${API_PORT}`;
const TEST_SCHEMA = 'ledger_e2e';
const TEST_PASSWORD = 'a deterministic ledger test passphrase';

interface TestIdentity {
  id: string;
  email: string;
  accessToken: string;
  personalLedgerId: string;
}

interface CreatedInvitation {
  token: string;
  expiresAt: string;
}

interface AuthenticatedApi {
  delete(path: string): request.Test;
  get(path: string): request.Test;
  patch(path: string): request.Test;
  post(path: string): request.Test;
}

describe('Ledger, membership, invitation, and authorization API', () => {
  let apiProcess: ChildProcessWithoutNullStreams;
  let database: pg.Client;
  let testDatabaseUrl: string;
  let sharedLedgerId: string;
  let sharedCreationBody: Record<string, unknown>;

  const users = new Map<string, TestIdentity>();

  beforeAll(async () => {
    config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });
    testDatabaseUrl = requireSafeTestDatabaseUrl();
    database = new pg.Client({ connectionString: testDatabaseUrl });
    await database.connect();
    await resetTestSchema(database);

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
      'outsider',
      'remove-member',
      'remove-admin',
      'leave-member',
      'leave-admin',
      'transfer-target',
      'email-match',
      'wrong-email',
      'open-user',
      'expired-user',
      'revoked-user',
      'race-user',
    ]) {
      users.set(name, await register(name));
    }

    const personal = await api('owner').post('/ledgers/personal').send({
      currency: 'try',
      description: 'Yalnız bana ait kayıtlar',
      name: '  Kişisel Defterim  ',
    });
    expect(personal.status).toBe(201);
    identity('owner').personalLedgerId = personal.body.id as string;

    const creation = await api('owner').post('/ledgers').send({
      currency: 'try',
      description: 'Ortak ev giderleri',
      name: '  Ev Arkadaşlarım  ',
    });
    expect(creation.status).toBe(201);
    sharedCreationBody = creation.body as Record<string, unknown>;
    sharedLedgerId = creation.body.id as string;

    for (const name of [
      'admin',
      'member',
      'remove-member',
      'remove-admin',
      'leave-member',
      'leave-admin',
      'transfer-target',
    ]) {
      await inviteAndAccept(name);
    }
    for (const name of ['admin', 'remove-admin', 'leave-admin']) {
      const response = await api('owner')
        .patch(`/ledgers/${sharedLedgerId}/members/${identity(name).id}`)
        .send({ role: 'ADMIN' });
      expect(response.status).toBe(200);
    }
  }, 90_000);

  afterAll(async () => {
    if (apiProcess?.exitCode === null) {
      apiProcess.kill('SIGTERM');
      await waitForProcessExit(apiProcess);
    }
    if (database) {
      await dropTestSchema(database);
      await database.end();
    }
  });

  describe('PERSONAL ledger and SHARED creation', () => {
    it('keeps registration ledger-free and creates PERSONAL only by opt-in', async () => {
      const owner = identity('owner');
      const empty = await api('outsider').get('/ledgers');
      const response = await api('owner').get('/ledgers');
      const personal = response.body.find(
        (ledger: { type: string }) => ledger.type === 'PERSONAL',
      );

      expect(response.status).toBe(200);
      expect(empty.status).toBe(200);
      expect(empty.body).toEqual([]);
      expect(personal).toMatchObject({
        currency: 'TRY',
        id: owner.personalLedgerId,
        name: 'Kişisel Defterim',
        ownerId: owner.id,
        role: 'OWNER',
        type: 'PERSONAL',
      });

      const invariant = await database.query<{
        ledgers: number;
        owners: number;
      }>(
        `SELECT
           COUNT(DISTINCT l.id)::int AS ledgers,
           COUNT(m.id)::int AS owners
         FROM "ledger_e2e"."Ledger" l
         JOIN "ledger_e2e"."LedgerMembership" m
           ON m."ledgerId" = l.id AND m."leftAt" IS NULL AND m.role = 'OWNER'
         WHERE l."ownerId" = $1 AND l.type = 'PERSONAL'`,
        [owner.id],
      );
      expect(invariant.rows[0]).toEqual({ ledgers: 1, owners: 1 });
    });

    it('rejects a second explicit PERSONAL ledger', async () => {
      const response = await api('owner').post('/ledgers/personal').send({
        currency: 'TRY',
        name: 'İkinci Kişisel',
      });
      expect(response.status).toBe(409);
    });

    it('does not let the generic SHARED endpoint select PERSONAL type', async () => {
      const response = await api('owner').post('/ledgers').send({
        currency: 'TRY',
        name: 'İkinci Kişisel',
        type: 'PERSONAL',
      });
      expect(response.status).toBe(400);
    });

    it('blocks invitations, leave, and archive for PERSONAL ledgers', async () => {
      const personalId = identity('owner').personalLedgerId;
      const invitation = await api('owner')
        .post(`/ledgers/${personalId}/invitations`)
        .send({});
      const leave = await api('owner').post(`/ledgers/${personalId}/leave`);
      const archive = await api('owner').post(`/ledgers/${personalId}/archive`);

      expect(invitation.status).toBe(400);
      expect(leave.status).toBe(400);
      expect(archive.status).toBe(400);
    });

    it('creates SHARED ledger and OWNER membership atomically', async () => {
      expect(sharedCreationBody).toMatchObject({
        currency: 'TRY',
        name: 'Ev Arkadaşlarım',
        ownerId: identity('owner').id,
        role: 'OWNER',
        type: 'SHARED',
      });
      const owners = await activeOwnerCount(sharedLedgerId);
      expect(owners).toBe(1);
    });
  });

  describe('resource access and updates', () => {
    it.each(['owner', 'admin', 'member'])(
      '%s can read the ledger',
      async (name) => {
        const response = await api(name).get(`/ledgers/${sharedLedgerId}`);
        expect(response.status).toBe(200);
      },
    );

    it('returns indistinguishable 404 responses for non-member and random UUID', async () => {
      const existing = await api('outsider').get(`/ledgers/${sharedLedgerId}`);
      const random = await api('outsider').get(
        '/ledgers/11111111-1111-4111-8111-111111111111',
      );

      expect(existing.status).toBe(404);
      expect(random.status).toBe(404);
      expect(existing.body.message).toBe(random.body.message);
    });

    it('allows OWNER and ADMIN updates but rejects MEMBER and non-member', async () => {
      const owner = await api('owner')
        .patch(`/ledgers/${sharedLedgerId}`)
        .send({ name: 'Owner Updated' });
      const admin = await api('admin')
        .patch(`/ledgers/${sharedLedgerId}`)
        .send({ description: 'Admin updated description' });
      const member = await api('member')
        .patch(`/ledgers/${sharedLedgerId}`)
        .send({ name: 'Denied' });
      const outsider = await api('outsider')
        .patch(`/ledgers/${sharedLedgerId}`)
        .send({ name: 'Hidden' });

      expect(owner.status).toBe(200);
      expect(admin.status).toBe(200);
      expect(member.status).toBe(403);
      expect(outsider.status).toBe(404);
    });
  });

  describe('membership roles and privacy', () => {
    it('lets every active member list safe member data', async () => {
      const response = await api('member').get(
        `/ledgers/${sharedLedgerId}/members`,
      );

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThan(2);
      expect(JSON.stringify(response.body)).not.toMatch(
        /email|passwordHash|refreshTokenHash|authSession/i,
      );
    });

    it('allows OWNER to switch MEMBER and ADMIN roles', async () => {
      const promoted = await api('owner')
        .patch(`/ledgers/${sharedLedgerId}/members/${identity('member').id}`)
        .send({ role: 'ADMIN' });
      const demoted = await api('owner')
        .patch(`/ledgers/${sharedLedgerId}/members/${identity('member').id}`)
        .send({ role: 'MEMBER' });

      expect(promoted.status).toBe(200);
      expect(promoted.body.role).toBe('ADMIN');
      expect(demoted.status).toBe(200);
      expect(demoted.body.role).toBe('MEMBER');
    });

    it('rejects role changes by ADMIN/MEMBER and normal OWNER reassignment', async () => {
      const byAdmin = await api('admin')
        .patch(`/ledgers/${sharedLedgerId}/members/${identity('member').id}`)
        .send({ role: 'ADMIN' });
      const byMember = await api('member')
        .patch(`/ledgers/${sharedLedgerId}/members/${identity('admin').id}`)
        .send({ role: 'MEMBER' });
      const ownerTarget = await api('owner')
        .patch(`/ledgers/${sharedLedgerId}/members/${identity('owner').id}`)
        .send({ role: 'ADMIN' });
      const ownerRole = await api('owner')
        .patch(`/ledgers/${sharedLedgerId}/members/${identity('member').id}`)
        .send({ role: 'OWNER' });

      expect(byAdmin.status).toBe(403);
      expect(byMember.status).toBe(403);
      expect(ownerTarget.status).toBe(400);
      expect(ownerRole.status).toBe(400);
    });

    it('allows OWNER to remove MEMBER and ADMIN without hard delete', async () => {
      const memberRemoval = await api('owner').delete(
        `/ledgers/${sharedLedgerId}/members/${identity('remove-member').id}`,
      );
      const adminRemoval = await api('owner').delete(
        `/ledgers/${sharedLedgerId}/members/${identity('remove-admin').id}`,
      );

      expect(memberRemoval.status).toBe(204);
      expect(adminRemoval.status).toBe(204);
      const rows = await database.query<{ leftAt: Date | null }>(
        `SELECT "leftAt" FROM "ledger_e2e"."LedgerMembership"
         WHERE "ledgerId" = $1 AND "userId" = ANY($2::uuid[])`,
        [
          sharedLedgerId,
          [identity('remove-member').id, identity('remove-admin').id],
        ],
      );
      expect(rows.rows).toHaveLength(2);
      expect(rows.rows.every((row) => row.leftAt !== null)).toBe(true);
    });

    it('rejects removal by ADMIN and removal of OWNER', async () => {
      const byAdmin = await api('admin').delete(
        `/ledgers/${sharedLedgerId}/members/${identity('member').id}`,
      );
      const ownerSelf = await api('owner').delete(
        `/ledgers/${sharedLedgerId}/members/${identity('owner').id}`,
      );

      expect(byAdmin.status).toBe(403);
      expect(ownerSelf.status).toBe(400);
    });

    it('allows MEMBER and ADMIN to leave but requires OWNER transfer', async () => {
      const member = await api('leave-member').post(
        `/ledgers/${sharedLedgerId}/leave`,
      );
      const admin = await api('leave-admin').post(
        `/ledgers/${sharedLedgerId}/leave`,
      );
      const owner = await api('owner').post(`/ledgers/${sharedLedgerId}/leave`);

      expect(member.status).toBe(201);
      expect(admin.status).toBe(201);
      expect(owner.status).toBe(400);
    });
  });

  describe('invitations', () => {
    it('allows OWNER and ADMIN creation and rejects MEMBER', async () => {
      const owner = await api('owner')
        .post(`/ledgers/${sharedLedgerId}/invitations`)
        .send({});
      const admin = await api('admin')
        .post(`/ledgers/${sharedLedgerId}/invitations`)
        .send({});
      const member = await api('member')
        .post(`/ledgers/${sharedLedgerId}/invitations`)
        .send({});

      expect(owner.status).toBe(201);
      expect(admin.status).toBe(201);
      expect(member.status).toBe(403);
    });

    it('stores only a deterministic hash and lists no token material', async () => {
      const created = await createInvitation('owner');
      const tokenHash = hashToken(created.token);
      const stored = await database.query<{ tokenHash: string }>(
        `SELECT "tokenHash" FROM "ledger_e2e"."LedgerInvitation"
         WHERE "tokenHash" = $1`,
        [tokenHash],
      );
      const listed = await api('admin').get(
        `/ledgers/${sharedLedgerId}/invitations`,
      );

      expect(created.token).toHaveLength(43);
      expect(stored.rows[0]?.tokenHash).toBe(tokenHash);
      expect(stored.rows[0]?.tokenHash).not.toBe(created.token);
      expect(listed.status).toBe(200);
      expect(JSON.stringify(listed.body)).not.toMatch(/tokenHash|"token"/);
    });

    it('accepts open and matching email-bound invitations', async () => {
      const open = await createInvitation('owner');
      const openAccepted = await api('open-user').post(
        `/invitations/${open.token}/accept`,
      );
      const emailBound = await createInvitation(
        'admin',
        identity('email-match').email.toUpperCase(),
      );
      const matchingAccepted = await api('email-match').post(
        `/invitations/${emailBound.token}/accept`,
      );

      expect(openAccepted.status).toBe(201);
      expect(matchingAccepted.status).toBe(201);
      expect(openAccepted.body.role).toBe('MEMBER');
    });

    it('rejects a non-matching email without consuming the invitation', async () => {
      const invitation = await createInvitation(
        'owner',
        identity('email-match').email,
      );
      const wrong = await api('wrong-email').post(
        `/invitations/${invitation.token}/accept`,
      );
      const matchingAlreadyMember = await api('email-match').post(
        `/invitations/${invitation.token}/accept`,
      );

      expect(wrong.status).toBe(403);
      expect(matchingAlreadyMember.status).toBe(409);
    });

    it('rejects expired and revoked invitations', async () => {
      const expired = await createInvitation('owner');
      await database.query(
        `UPDATE "ledger_e2e"."LedgerInvitation"
         SET "expiresAt" = NOW() - INTERVAL '1 second'
         WHERE "tokenHash" = $1`,
        [hashToken(expired.token)],
      );
      const expiredAccept = await api('expired-user').post(
        `/invitations/${expired.token}/accept`,
      );

      const revoked = await createInvitation('admin');
      const invitationRow = await database.query<{ id: string }>(
        `SELECT id FROM "ledger_e2e"."LedgerInvitation" WHERE "tokenHash" = $1`,
        [hashToken(revoked.token)],
      );
      const invitationId = invitationRow.rows[0]?.id;
      const firstRevoke = await api('admin').delete(
        `/ledgers/${sharedLedgerId}/invitations/${invitationId}`,
      );
      const secondRevoke = await api('admin').delete(
        `/ledgers/${sharedLedgerId}/invitations/${invitationId}`,
      );
      const revokedAccept = await api('revoked-user').post(
        `/invitations/${revoked.token}/accept`,
      );

      expect(expiredAccept.status).toBe(410);
      expect(firstRevoke.status).toBe(204);
      expect(secondRevoke.status).toBe(204);
      expect(revokedAccept.status).toBe(410);
    });

    it('rejects accepted token reuse and duplicate active membership', async () => {
      const accepted = await createInvitation('owner');
      const first = await api('wrong-email').post(
        `/invitations/${accepted.token}/accept`,
      );
      const reused = await api('wrong-email').post(
        `/invitations/${accepted.token}/accept`,
      );
      const duplicate = await createInvitation('owner');
      const duplicateAccept = await api('member').post(
        `/invitations/${duplicate.token}/accept`,
      );
      const count = await activeMembershipCount(identity('member').id);

      expect(first.status).toBe(201);
      expect(reused.status).toBe(410);
      expect(duplicateAccept.status).toBe(409);
      expect(count).toBe(1);
    });

    it('allows only one concurrent acceptance of the same token', async () => {
      const invitation = await createInvitation('owner');
      const [first, second] = await Promise.all([
        api('race-user').post(`/invitations/${invitation.token}/accept`),
        api('race-user').post(`/invitations/${invitation.token}/accept`),
      ]);
      const statuses = [first.status, second.status].sort();

      expect(statuses[0]).toBe(201);
      expect([409, 410]).toContain(statuses[1]);
      expect(await activeMembershipCount(identity('race-user').id)).toBe(1);
    });
  });

  describe('ownership transfer and archive lifecycle', () => {
    it('transfers ownership atomically and keeps exactly one OWNER', async () => {
      const response = await api('owner')
        .post(`/ledgers/${sharedLedgerId}/transfer-ownership`)
        .send({ newOwnerUserId: identity('transfer-target').id });

      expect(response.status).toBe(201);
      expect(response.body.ownerId).toBe(identity('transfer-target').id);
      expect(await activeOwnerCount(sharedLedgerId)).toBe(1);

      const roles = await database.query<{ userId: string; role: string }>(
        `SELECT "userId", role::text FROM "ledger_e2e"."LedgerMembership"
         WHERE "ledgerId" = $1 AND "leftAt" IS NULL
           AND "userId" = ANY($2::uuid[])`,
        [
          sharedLedgerId,
          [identity('owner').id, identity('transfer-target').id],
        ],
      );
      expect(roles.rows).toEqual(
        expect.arrayContaining([
          { userId: identity('owner').id, role: 'ADMIN' },
          { userId: identity('transfer-target').id, role: 'OWNER' },
        ]),
      );
    });

    it('rejects transfer by ADMIN and MEMBER', async () => {
      const admin = await api('owner')
        .post(`/ledgers/${sharedLedgerId}/transfer-ownership`)
        .send({ newOwnerUserId: identity('member').id });
      const member = await api('member')
        .post(`/ledgers/${sharedLedgerId}/transfer-ownership`)
        .send({ newOwnerUserId: identity('admin').id });

      expect(admin.status).toBe(403);
      expect(member.status).toBe(403);
    });

    it('allows only OWNER to archive and keeps archived ledger readable', async () => {
      const byAdmin = await api('owner').post(
        `/ledgers/${sharedLedgerId}/archive`,
      );
      const byMember = await api('member').post(
        `/ledgers/${sharedLedgerId}/archive`,
      );
      const archived = await api('transfer-target').post(
        `/ledgers/${sharedLedgerId}/archive`,
      );
      const readable = await api('member').get(`/ledgers/${sharedLedgerId}`);
      const members = await api('member').get(
        `/ledgers/${sharedLedgerId}/members`,
      );
      const blockedInvite = await api('transfer-target')
        .post(`/ledgers/${sharedLedgerId}/invitations`)
        .send({});

      expect(byAdmin.status).toBe(403);
      expect(byMember.status).toBe(403);
      expect(archived.status).toBe(201);
      expect(readable.status).toBe(200);
      expect(members.status).toBe(200);
      expect(blockedInvite.status).toBe(409);
    });

    it('allows OWNER to unarchive', async () => {
      const response = await api('transfer-target').post(
        `/ledgers/${sharedLedgerId}/unarchive`,
      );
      expect(response.status).toBe(201);
      expect(response.body.archivedAt).toBeNull();
    });
  });

  describe('Swagger privacy', () => {
    it('does not expose membership or invitation secrets', async () => {
      const response = await request(API_URL).get('/docs-json');
      expect(response.status).toBe(200);
      expect(JSON.stringify(response.body)).not.toMatch(
        /passwordHash|refreshTokenHash|tokenHash|AuthSession/,
      );
    });
  });

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

  function identity(name: string): TestIdentity {
    const user = users.get(name);
    if (!user) throw new Error(`Unknown test identity: ${name}`);
    return user;
  }

  async function register(name: string): Promise<TestIdentity> {
    const email = `phase2-${name}@example.com`;
    const response = await request(API_URL).post('/auth/register').send({
      displayName: name,
      email,
      password: TEST_PASSWORD,
    });
    expect(response.status).toBe(201);
    const ledgers = await request(API_URL)
      .get('/ledgers')
      .set('Authorization', `Bearer ${response.body.accessToken}`);
    expect(ledgers.status).toBe(200);
    expect(ledgers.body).toEqual([]);
    return {
      accessToken: response.body.accessToken as string,
      email,
      id: response.body.user.id as string,
      personalLedgerId: '',
    };
  }

  async function inviteAndAccept(name: string): Promise<void> {
    const invitation = await createInvitation('owner');
    const response = await api(name).post(
      `/invitations/${invitation.token}/accept`,
    );
    expect(response.status).toBe(201);
  }

  async function createInvitation(
    actor: string,
    email?: string,
  ): Promise<CreatedInvitation> {
    const response = await api(actor)
      .post(`/ledgers/${sharedLedgerId}/invitations`)
      .send(email ? { email } : {});
    expect(response.status).toBe(201);
    return response.body as CreatedInvitation;
  }

  async function activeOwnerCount(ledgerId: string): Promise<number> {
    const result = await database.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM "ledger_e2e"."LedgerMembership"
       WHERE "ledgerId" = $1 AND role = 'OWNER' AND "leftAt" IS NULL`,
      [ledgerId],
    );
    return result.rows[0]?.count ?? 0;
  }

  async function activeMembershipCount(userId: string): Promise<number> {
    const result = await database.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM "ledger_e2e"."LedgerMembership"
       WHERE "ledgerId" = $1 AND "userId" = $2 AND "leftAt" IS NULL`,
      [sharedLedgerId, userId],
    );
    return result.rows[0]?.count ?? 0;
  }
});

function requireSafeTestDatabaseUrl(): string {
  const value = process.env.TEST_DATABASE_URL;
  if (!value)
    throw new Error('TEST_DATABASE_URL is required for API/e2e tests');
  const parsed = new URL(value);
  const isLocal = ['127.0.0.1', 'localhost'].includes(parsed.hostname);
  if (!isLocal) throw new Error('TEST_DATABASE_URL must be local');
  parsed.searchParams.set('schema', TEST_SCHEMA);
  return parsed.toString();
}

async function resetTestSchema(database: pg.Client): Promise<void> {
  await dropTestSchema(database);
  await database.query(`CREATE SCHEMA "${TEST_SCHEMA}"`);
}

async function dropTestSchema(database: pg.Client): Promise<void> {
  await database.query(`DROP SCHEMA IF EXISTS "${TEST_SCHEMA}" CASCADE`);
}

async function waitForApi(
  apiProcess: ChildProcessWithoutNullStreams,
): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (apiProcess.exitCode !== null) {
      throw new Error(
        `API exited before tests started: ${apiProcess.stderr.read()?.toString() ?? ''}`,
      );
    }
    try {
      if ((await request(API_URL).get('/health')).status === 200) return;
    } catch {
      // API is still starting.
    }
    await delay(100);
  }
  throw new Error('API did not start in time');
}

function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForProcessExit(
  apiProcess: ChildProcessWithoutNullStreams,
): Promise<void> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      once(apiProcess, 'exit'),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new Error('API process did not stop in time')),
          3_000,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
