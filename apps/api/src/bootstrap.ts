import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { configureApplication } from './application.js';

export async function createApplication(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  configureApplication(app);

  return app;
}

export function configureOpenApi(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Defterdar API')
    .setDescription('Defterdar REST API')
    .setVersion('0.1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document);
}
