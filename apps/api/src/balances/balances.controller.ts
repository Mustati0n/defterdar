import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { BalanceResponseDto } from './dto/balance-response.dto.js';
import { BalancesService } from './balances.service.js';

@ApiTags('balances')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard)
@Controller()
export class BalancesController {
  constructor(private readonly service: BalancesService) {}
  @Get('ledgers/:ledgerId/balances')
  @ApiOperation({
    summary:
      'Derived ledger balance; positive netMinor receives, negative owes',
  })
  @ApiOkResponse({ type: BalanceResponseDto })
  ledger(
    @Param('ledgerId', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: SafeUser,
  ) {
    return this.service.ledger(id, user.id);
  }
  @Get('plans/:planId/balances')
  @ApiOperation({
    summary: 'Derived plan balance; positive netMinor receives, negative owes',
  })
  @ApiOkResponse({ type: BalanceResponseDto })
  plan(
    @Param('planId', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: SafeUser,
  ) {
    return this.service.plan(id, user.id);
  }
}
