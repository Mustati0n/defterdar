import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { HealthResponse } from '@defterdar/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';

@ApiTags('system')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Check whether the API process is healthy' })
  @ApiOkResponse({
    schema: {
      example: { status: 'ok' },
      properties: { status: { type: 'string', enum: ['ok'] } },
      required: ['status'],
    },
  })
  getHealth(): HealthResponse {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Check PostgreSQL readiness' })
  @ApiOkResponse({ schema: { example: { status: 'ready', database: 'ok' } } })
  async getReadiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', database: 'ok' } as const;
    } catch {
      throw new ServiceUnavailableException('Database is not ready');
    }
  }
}
