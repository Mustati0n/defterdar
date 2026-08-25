import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { SafeUser } from '../users/dto/user-response.dto.js';
import { AnalyticsService } from './analytics.service.js';
import { AnalyticsQueryDto } from './dto/analytics-query.dto.js';
import { AnalyticsSummaryResponseDto } from './dto/analytics-response.dto.js';

@ApiTags('analytics')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard)
@Controller()
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('ledgers/:ledgerId/analytics/summary')
  @ApiOperation({
    summary:
      'Derived spending/cashflow analytics; settlements and offsets excluded',
  })
  @ApiOkResponse({ type: AnalyticsSummaryResponseDto })
  ledger(
    @Param('ledgerId', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: SafeUser,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.service.ledger(id, user.id, query);
  }

  @Get('plans/:planId/analytics/summary')
  @ApiOkResponse({ type: AnalyticsSummaryResponseDto })
  plan(
    @Param('planId', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: SafeUser,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.service.plan(id, user.id, query);
  }
}
