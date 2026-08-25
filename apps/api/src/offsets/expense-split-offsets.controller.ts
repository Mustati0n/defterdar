import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { SafeUser } from '../users/dto/user-response.dto.js';
import { CreateExpenseSplitOffsetDto } from './dto/create-expense-split-offset.dto.js';
import {
  ExpenseSplitOffsetResponseDto,
  OffsetAvailabilityResponseDto,
} from './dto/expense-split-offset-response.dto.js';
import { ExpenseSplitOffsetsService } from './expense-split-offsets.service.js';
import { IdempotencyService } from '../idempotency/idempotency.service.js';

@ApiTags('expense offsets')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard)
@Controller()
export class ExpenseSplitOffsetsController {
  constructor(
    private readonly service: ExpenseSplitOffsetsService,
    private readonly idempotency: IdempotencyService,
  ) {}

  @Get('expense-splits/:expenseSplitId/offset-availability')
  @ApiOperation({
    summary: 'Calculate Borçtan düş availability without changing balance',
  })
  @ApiOkResponse({ type: OffsetAvailabilityResponseDto })
  availability(
    @Param('expenseSplitId', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: SafeUser,
  ) {
    return this.service.availability(id, user.id);
  }

  @Post('expense-splits/:expenseSplitId/offsets')
  @ApiCreatedResponse({ type: ExpenseSplitOffsetResponseDto })
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  create(
    @Param('expenseSplitId', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: SafeUser,
    @Body() dto: CreateExpenseSplitOffsetDto,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.idempotency.execute(
      user.id,
      `offset.create:${id}`,
      key,
      dto,
      () => this.service.create(id, user.id, dto),
    );
  }

  @Post('expense-split-offsets/:offsetId/void')
  @ApiOkResponse({ type: ExpenseSplitOffsetResponseDto })
  void(
    @Param('offsetId', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: SafeUser,
  ) {
    return this.service.void(id, user.id);
  }
}
