import { ConfigService } from '@nestjs/config';
import { configureOpenApi, createApplication } from './bootstrap.js';
import type { Environment } from './config/environment.js';

async function bootstrap(): Promise<void> {
  const app = await createApplication();
  const configService = app.get(ConfigService<Environment, true>);
  const port = configService.get('API_PORT', { infer: true });

  configureOpenApi(app);
  await app.listen(port);
}

void bootstrap();
