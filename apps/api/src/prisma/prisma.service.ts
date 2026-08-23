import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import type { Environment } from '../config/environment.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(configService: ConfigService<Environment, true>) {
    const connectionString = configService.get('DATABASE_URL', { infer: true });
    const schema =
      new URL(connectionString).searchParams.get('schema') ?? 'public';
    const adapter = new PrismaPg(
      {
        connectionString,
      },
      { schema },
    );
    super({ adapter });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
