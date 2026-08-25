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

const API_PORT = 3101;
const API_URL = `http://127.0.0.1:${API_PORT}`;
const TEST_SCHEMA = 'auth_e2e';
const TEST_PASSWORD = 'a deterministic test passphrase';
const SAFE_RESPONSE_KEYS = ['id', 'email', 'displayName'];

interface AuthResponseBody {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    displayName: string;
  };
}

describe('Authentication and user identity API', () => {
  let apiProcess: ChildProcessWithoutNullStreams;
  let database: pg.Client;
  let testDatabaseUrl: string;

  beforeAll(async () => {
    config({
      path: path.resolve(__dirname, '../../../.env'),
      quiet: true,
    });
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
        JWT_ACCESS_SECRET:
          'test-only-access-secret-with-at-least-32-characters',
        JWT_ACCESS_TTL: '900',
        NODE_ENV: 'test',
      },
      stdio: 'pipe',
    });

    await waitForApi(apiProcess);
  }, 60_000);

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

  describe('registration', () => {
    const email = 'phase1-register@example.com';
    let registered: AuthResponseBody;

    it('registers, normalizes email, hashes the password, and opens a session', async () => {
      const response = await register(
        `  ${email.toUpperCase()}  `,
        'Register User',
      );

      expect(response.status).toBe(201);
      registered = response.body as AuthResponseBody;
      expect(registered.expiresIn).toBe(900);
      expect(registered.user).toEqual({
        id: expect.any(String),
        email,
        displayName: 'Register User',
      });
      expect(registered.accessToken).toEqual(expect.any(String));
      expect(registered.refreshToken).toEqual(expect.any(String));
      expectSafeResponse(response.body);

      const result = await database.query<{
        passwordHash: string;
        refreshTokenHash: string;
      }>(
        `SELECT u."passwordHash", s."refreshTokenHash"
         FROM "auth_e2e"."User" u
         JOIN "auth_e2e"."AuthSession" s ON s."userId" = u.id
         WHERE u.email = $1`,
        [email],
      );
      expect(result.rows[0]?.passwordHash).toMatch(/^\$argon2id\$/);
      expect(result.rows[0]?.refreshTokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(result.rows[0]?.refreshTokenHash).not.toBe(
        registered.refreshToken,
      );

      const ledgers = await request(API_URL)
        .get('/ledgers')
        .set('Authorization', `Bearer ${registered.accessToken}`);
      expect(ledgers.status).toBe(200);
      expect(ledgers.body).toEqual([]);
    });

    it('rejects a duplicate normalized email', async () => {
      const response = await register(
        ` ${email.toUpperCase()} `,
        'Duplicate User',
      );
      expect(response.status).toBe(409);
    });

    it('rejects an invalid email', async () => {
      const response = await register('not-an-email', 'Invalid Email');
      expect(response.status).toBe(400);
    });

    it('rejects a short password', async () => {
      const response = await register(
        'short-password@example.com',
        'Short Password',
        'too-short',
      );
      expect(response.status).toBe(400);
    });
  });

  describe('login', () => {
    const email = 'phase1-login@example.com';

    beforeAll(async () => {
      expect((await register(email, 'Login User')).status).toBe(201);
    });

    it('logs in with valid credentials', async () => {
      const response = await request(API_URL)
        .post('/auth/login')
        .send({ email, password: TEST_PASSWORD });

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe(email);
      expectSafeResponse(response.body);
    });

    it('returns the same public error for a wrong password and unknown email', async () => {
      const wrongPassword = await request(API_URL)
        .post('/auth/login')
        .send({ email, password: 'this password is wrong' });
      const unknownEmail = await request(API_URL)
        .post('/auth/login')
        .send({ email: 'unknown@example.com', password: TEST_PASSWORD });

      expect(wrongPassword.status).toBe(401);
      expect(unknownEmail.status).toBe(401);
      expect(wrongPassword.body.message).toBe('Invalid credentials');
      expect(unknownEmail.body.message).toBe(wrongPassword.body.message);
      expect(unknownEmail.body.statusCode).toBe(wrongPassword.body.statusCode);
    });
  });

  describe('authenticated profile', () => {
    let auth: AuthResponseBody;

    beforeAll(async () => {
      const response = await register(
        'phase1-profile@example.com',
        'Profile User',
      );
      expect(response.status).toBe(201);
      auth = response.body as AuthResponseBody;
    });

    it('rejects missing and invalid access tokens', async () => {
      const missing = await request(API_URL).get('/users/me');
      const invalid = await request(API_URL)
        .get('/users/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(missing.status).toBe(401);
      expect(invalid.status).toBe(401);
    });

    it('returns the current user for a valid access token', async () => {
      const response = await request(API_URL)
        .get('/users/me')
        .set('Authorization', `Bearer ${auth.accessToken}`);

      expect(response.status).toBe(200);
      expect(Object.keys(response.body).sort()).toEqual(
        [...SAFE_RESPONSE_KEYS].sort(),
      );
      expect(response.body.email).toBe('phase1-profile@example.com');
      expectSafeResponse(response.body);
    });

    it('updates only the display name', async () => {
      const response = await request(API_URL)
        .patch('/users/me')
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .send({ displayName: 'Updated Profile' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: auth.user.id,
        email: auth.user.email,
        displayName: 'Updated Profile',
      });
      expectSafeResponse(response.body);
    });
  });

  describe('refresh rotation', () => {
    let auth: AuthResponseBody;
    let rotatedRefreshToken: string;

    beforeAll(async () => {
      const response = await register(
        'phase1-refresh@example.com',
        'Refresh User',
      );
      expect(response.status).toBe(201);
      auth = response.body as AuthResponseBody;
    });

    it('rotates a valid refresh token', async () => {
      const response = await request(API_URL)
        .post('/auth/refresh')
        .send({ refreshToken: auth.refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toEqual(expect.any(String));
      expect(response.body.refreshToken).toEqual(expect.any(String));
      expect(response.body.refreshToken).not.toBe(auth.refreshToken);
      expect(response.body.expiresIn).toBe(900);
      expectSafeResponse(response.body);
      rotatedRefreshToken = response.body.refreshToken as string;
    });

    it('rejects reuse of the old refresh token', async () => {
      const response = await request(API_URL)
        .post('/auth/refresh')
        .send({ refreshToken: auth.refreshToken });

      expect(response.status).toBe(401);
    });

    it('rejects an expired refresh token', async () => {
      const tokenHash = hashRefreshToken(rotatedRefreshToken);
      await database.query(
        `UPDATE "auth_e2e"."AuthSession"
         SET "expiresAt" = NOW() - INTERVAL '1 second'
         WHERE "refreshTokenHash" = $1`,
        [tokenHash],
      );

      const response = await request(API_URL)
        .post('/auth/refresh')
        .send({ refreshToken: rotatedRefreshToken });
      expect(response.status).toBe(401);
    });
  });

  describe('logout', () => {
    let auth: AuthResponseBody;

    beforeAll(async () => {
      const response = await register(
        'phase1-logout@example.com',
        'Logout User',
      );
      expect(response.status).toBe(201);
      auth = response.body as AuthResponseBody;
    });

    it('revokes the session idempotently', async () => {
      const first = await request(API_URL)
        .post('/auth/logout')
        .send({ refreshToken: auth.refreshToken });
      const second = await request(API_URL)
        .post('/auth/logout')
        .send({ refreshToken: auth.refreshToken });

      expect(first.status).toBe(204);
      expect(second.status).toBe(204);
    });

    it('does not refresh a revoked session', async () => {
      const response = await request(API_URL)
        .post('/auth/refresh')
        .send({ refreshToken: auth.refreshToken });
      expect(response.status).toBe(401);
    });
  });

  describe('API documentation security', () => {
    it('does not expose persisted secret fields in OpenAPI schemas', async () => {
      const response = await request(API_URL).get('/docs-json');

      expect(response.status).toBe(200);
      expect(JSON.stringify(response.body)).not.toMatch(
        /passwordHash|refreshTokenHash/,
      );
    });
  });

  function register(
    email: string,
    displayName: string,
    password = TEST_PASSWORD,
  ): request.Test {
    return request(API_URL)
      .post('/auth/register')
      .send({ displayName, email, password });
  }
});

function requireSafeTestDatabaseUrl(): string {
  const value = process.env.TEST_DATABASE_URL;
  if (!value) {
    throw new Error('TEST_DATABASE_URL is required for API/e2e tests');
  }

  const parsed = new URL(value);
  const isLocal = ['127.0.0.1', 'localhost'].includes(parsed.hostname);
  if (!isLocal || parsed.searchParams.get('schema') !== TEST_SCHEMA) {
    throw new Error('TEST_DATABASE_URL must target the local auth_e2e schema');
  }
  return value;
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
  let lastError: unknown;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (apiProcess.exitCode !== null) {
      throw new Error(
        `API exited before tests started: ${apiProcess.stderr.read()?.toString() ?? ''}`,
      );
    }
    try {
      const response = await request(API_URL).get('/health');
      if (response.status === 200) {
        return;
      }
    } catch (error) {
      lastError = error;
    }
    await delay(100);
  }
  throw new Error(`API did not start in time: ${String(lastError)}`);
}

function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function expectSafeResponse(value: unknown): void {
  expect(JSON.stringify(value)).not.toMatch(
    /"(?:password|passwordHash|refreshTokenHash)"\s*:/,
  );
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
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
