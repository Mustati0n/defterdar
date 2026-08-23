import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import type { Environment } from './config/environment.js';
import { json, urlencoded } from 'express';
import helmet from 'helmet';

export function configureApplication(app: INestApplication): void {
  const configService = app.get(ConfigService<Environment, true>);
  const origins = configService.get('CORS_ORIGINS', { infer: true });
  const bodyLimit = configService.get('API_BODY_LIMIT', { infer: true }) ?? '1mb';
  const production = configService.get('NODE_ENV', { infer: true }) === 'production';

  app.use(helmet(production ? {} : { contentSecurityPolicy: false }));
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ extended: true, limit: bodyLimit }));
  app.enableCors({
    credentials: true,
    origin: origins,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
}
