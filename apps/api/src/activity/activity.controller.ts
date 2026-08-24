import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { SafeUser } from '../users/dto/user-response.dto.js';
import { ActivityLogService } from './activity-log.service.js';
import { ActivityQueryDto } from './dto/activity-query.dto.js';
import { ActivityPageDto } from './dto/activity-response.dto.js';

@ApiTags('activity')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard)
@Controller()
export class ActivityController {
  constructor(private readonly service: ActivityLogService) {}

  @Get('ledgers/:ledgerId/activity')
  @ApiOperation({ summary: 'Read immutable Ledger or Plan-scoped activity with cursor pagination' })
  @ApiOkResponse({ type: ActivityPageDto })
  list(@Param('ledgerId', new ParseUUIDPipe({ version: '4' })) ledgerId: string, @CurrentUser() user: SafeUser, @Query() query: ActivityQueryDto) {
    return this.service.list(ledgerId, user.id, query);
  }
}
