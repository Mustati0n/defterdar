import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import type { SafeUser } from '../users/dto/user-response.dto.js';
import { CreatePlanDto } from './dto/create-plan.dto.js';
import { ListPlansQueryDto } from './dto/list-plans-query.dto.js';
import { PlanResponseDto } from './dto/plan-response.dto.js';
import { PlansService } from './plans.service.js';

@ApiTags('plans')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard)
@Controller('ledgers/:ledgerId/plans')
export class LedgerPlansController {
  constructor(private readonly plansService: PlansService) {}

  @Post()
  @ApiOperation({ summary: 'Create a plan under an active ledger' })
  @ApiCreatedResponse({ type: PlanResponseDto })
  create(
    @Param('ledgerId', new ParseUUIDPipe({ version: '4' })) ledgerId: string,
    @CurrentUser() user: SafeUser,
    @Body() input: CreatePlanDto,
  ): Promise<PlanResponseDto> {
    return this.plansService.create(ledgerId, user, input);
  }

  @Get()
  @ApiOperation({ summary: 'List plans in an accessible ledger' })
  @ApiOkResponse({ type: PlanResponseDto, isArray: true })
  list(
    @Param('ledgerId', new ParseUUIDPipe({ version: '4' })) ledgerId: string,
    @CurrentUser() user: SafeUser,
    @Query() query: ListPlansQueryDto,
  ): Promise<PlanResponseDto[]> {
    return this.plansService.list(ledgerId, user.id, query);
  }
}
