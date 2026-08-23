import { Body, Controller, Get, Headers, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiHeader, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { SafeUser } from '../users/dto/user-response.dto.js';
import { CreateIncomeDto } from './dto/create-income.dto.js';
import { IncomeResponseDto } from './dto/income-response.dto.js';
import { UpdateIncomeDto } from './dto/update-income.dto.js';
import { IncomesService } from './incomes.service.js';
import { IdempotencyService } from '../idempotency/idempotency.service.js';

@ApiTags('incomes')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard)
@Controller()
export class IncomesController {
  constructor(private readonly service: IncomesService, private readonly idempotency: IdempotencyService) {}

  @Post('ledgers/:ledgerId/incomes')
  @ApiOperation({ summary: 'Create cashflow income; does not alter interpersonal balance' })
  @ApiCreatedResponse({ type: IncomeResponseDto })
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  create(@Param('ledgerId', new ParseUUIDPipe({ version: '4' })) ledgerId: string, @CurrentUser() user: SafeUser, @Body() dto: CreateIncomeDto, @Headers('idempotency-key') key?: string) {
    return this.idempotency.execute(user.id, `income.create:${ledgerId}`, key, dto, () =>
      this.service.create(ledgerId, user.id, dto),
    );
  }

  @Get('ledgers/:ledgerId/incomes')
  @ApiOkResponse({ type: IncomeResponseDto, isArray: true })
  list(@Param('ledgerId', new ParseUUIDPipe({ version: '4' })) ledgerId: string, @CurrentUser() user: SafeUser, @Query('planId') planId?: string) {
    return this.service.list(ledgerId, user.id, planId);
  }

  @Get('incomes/:incomeId')
  @ApiOkResponse({ type: IncomeResponseDto })
  get(@Param('incomeId', new ParseUUIDPipe({ version: '4' })) id: string, @CurrentUser() user: SafeUser) {
    return this.service.get(id, user.id);
  }

  @Patch('incomes/:incomeId')
  @ApiOkResponse({ type: IncomeResponseDto })
  update(@Param('incomeId', new ParseUUIDPipe({ version: '4' })) id: string, @CurrentUser() user: SafeUser, @Body() dto: UpdateIncomeDto) {
    return this.service.update(id, user.id, dto);
  }

  @Post('incomes/:incomeId/void')
  @ApiOperation({ summary: 'Void income without deleting financial history' })
  @ApiOkResponse({ type: IncomeResponseDto })
  void(@Param('incomeId', new ParseUUIDPipe({ version: '4' })) id: string, @CurrentUser() user: SafeUser) {
    return this.service.void(id, user.id);
  }
}
