import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { HealthResponse } from '@defterdar/shared-types';

@ApiTags('system')
@Controller('health')
export class HealthController {
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
}
