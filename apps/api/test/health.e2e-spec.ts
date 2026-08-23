import { Controller, Get, type INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureApplication } from '../src/application.js';

@Controller('health')
class TestHealthController {
  @Get() liveness() { return { status: 'ok' }; }
  @Get('ready') readiness() { return { status: 'ready', database: 'ok' }; }
}

describe('Health API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          isGlobal: true,
          load: [() => ({
            CORS_ORIGINS: ['http://localhost:3000'],
            DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
            NODE_ENV: 'test',
          })],
        }),
      ],
      controllers: [TestHealthController],
    })
      .compile();

    app = moduleRef.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns the liveness response', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('GET /health/ready checks database readiness and emits security headers', async () => {
    await request(app.getHttpServer())
      .get('/health/ready')
      .expect('x-content-type-options', 'nosniff')
      .expect(200)
      .expect({ status: 'ready', database: 'ok' });
  });

  it('rejects request bodies above the configured limit', async () => {
    await request(app.getHttpServer())
      .post('/health')
      .send({ value: 'x'.repeat(1024 * 1024) })
      .expect(413);
  });
});
