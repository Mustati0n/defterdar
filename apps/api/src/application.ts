import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import type { Environment } from './config/environment.js';

export function configureApplication(app: INestApplication): void {
  const configService = app.get(ConfigService<Environment, true>);
  const origins = configService.get('CORS_ORIGINS', { infer: true });

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
