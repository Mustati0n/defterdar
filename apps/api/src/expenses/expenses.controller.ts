import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
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
import { ExpensesService } from './expenses.service.js';
import { CreateExpenseDto } from './dto/create-expense.dto.js';
import { UpdateExpenseDto } from './dto/update-expense.dto.js';
import { ExpenseResponseDto } from './dto/expense-response.dto.js';
import { IdempotencyService } from '../idempotency/idempotency.service.js';
@ApiTags('expenses')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard)
@Controller()
export class ExpensesController {
  constructor(
    private readonly service: ExpensesService,
    private readonly idempotency: IdempotencyService,
  ) {}
  @ApiOperation({ summary: 'Create an expense and splits atomically' })
  @ApiCreatedResponse({ type: ExpenseResponseDto })
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  @Post('ledgers/:ledgerId/expenses')
  create(
    @Param('ledgerId', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() u: SafeUser,
    @Body() d: CreateExpenseDto,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.idempotency.execute(u.id, `expense.create:${id}`, key, d, () =>
      this.service.create(id, u.id, d),
    );
  }
  @ApiOperation({ summary: 'List ledger expenses' })
  @ApiOkResponse({ type: ExpenseResponseDto, isArray: true })
  @Get('ledgers/:ledgerId/expenses')
  list(
    @Param('ledgerId', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() u: SafeUser,
    @Query('planId') p?: string,
  ) {
    return this.service.list(id, u.id, p);
  }
  @ApiOperation({ summary: 'Read an expense and safe split summaries' })
  @ApiOkResponse({ type: ExpenseResponseDto })
  @Get('expenses/:expenseId')
  get(
    @Param('expenseId', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() u: SafeUser,
  ) {
    return this.service.get(id, u.id);
  }
  @ApiOperation({
    summary: 'Update an expense and recompute splits atomically',
  })
  @ApiOkResponse({ type: ExpenseResponseDto })
  @Patch('expenses/:expenseId')
  update(
    @Param('expenseId', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() u: SafeUser,
    @Body() d: UpdateExpenseDto,
  ) {
    return this.service.update(id, u.id, d);
  }
  @ApiOperation({ summary: 'Void without deleting financial history' })
  @ApiOkResponse({ type: ExpenseResponseDto })
  @Post('expenses/:expenseId/void')
  void(
    @Param('expenseId', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() u: SafeUser,
  ) {
    return this.service.void(id, u.id);
  }
}
