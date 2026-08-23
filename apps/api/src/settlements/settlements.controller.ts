import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { SafeUser } from '../users/dto/user-response.dto.js';
import { CreateSettlementDto } from './dto/create-settlement.dto.js';
import { SettlementResponseDto } from './dto/settlement-response.dto.js';
import { SettlementsService } from './settlements.service.js';

@ApiTags('settlements')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard)
@Controller()
export class SettlementsController {
  constructor(private readonly service: SettlementsService) {}

  @Post('ledgers/:ledgerId/settlements')
  @ApiOperation({ summary: 'Record a validated settlement atomically' })
  @ApiCreatedResponse({ type: SettlementResponseDto })
  create(@Param('ledgerId', new ParseUUIDPipe({ version: '4' })) ledgerId: string, @CurrentUser() user: SafeUser, @Body() dto: CreateSettlementDto) {
    return this.service.create(ledgerId, user.id, dto);
  }

  @Get('ledgers/:ledgerId/settlements')
  @ApiOperation({ summary: 'List ledger settlements, optionally by plan' })
  @ApiOkResponse({ type: SettlementResponseDto, isArray: true })
  list(@Param('ledgerId', new ParseUUIDPipe({ version: '4' })) ledgerId: string, @CurrentUser() user: SafeUser, @Query('planId') planId?: string) {
    return this.service.list(ledgerId, user.id, planId);
  }

  @Get('settlements/:settlementId')
  @ApiOkResponse({ type: SettlementResponseDto })
  get(@Param('settlementId', new ParseUUIDPipe({ version: '4' })) id: string, @CurrentUser() user: SafeUser) {
    return this.service.get(id, user.id);
  }

  @Post('settlements/:settlementId/void')
  @ApiOperation({ summary: 'Void a settlement without deleting history' })
  @ApiOkResponse({ type: SettlementResponseDto })
  void(@Param('settlementId', new ParseUUIDPipe({ version: '4' })) id: string, @CurrentUser() user: SafeUser) {
    return this.service.void(id, user.id);
  }
}
