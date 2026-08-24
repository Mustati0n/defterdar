import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import type { SafeUser } from '../users/dto/user-response.dto.js';
import { AddParticipantDto } from './dto/add-participant.dto.js';
import { MovePlanDto } from './dto/move-plan.dto.js';
import {
  PlanParticipantResponseDto,
  PlanResponseDto,
} from './dto/plan-response.dto.js';
import { UpdatePlanDto } from './dto/update-plan.dto.js';
import { ListPlansQueryDto } from './dto/list-plans-query.dto.js';
import { PlansService } from './plans.service.js';

@ApiTags('plans')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard)
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  @ApiOperation({ summary: 'List plans in active ledgers for the current user' })
  @ApiOkResponse({ type: PlanResponseDto, isArray: true })
  list(
    @CurrentUser() user: SafeUser,
    @Query() query: ListPlansQueryDto,
  ): Promise<PlanResponseDto[]> {
    return this.plansService.listForUser(user.id, query.includeArchived);
  }

  @Get(':planId')
  @ApiOperation({ summary: 'Read a plan through its ledger membership' })
  @ApiOkResponse({ type: PlanResponseDto })
  get(
    @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string,
    @CurrentUser() user: SafeUser,
  ): Promise<PlanResponseDto> {
    return this.plansService.get(planId, user.id);
  }

  @Patch(':planId')
  @ApiOperation({ summary: 'Update plan metadata' })
  @ApiOkResponse({ type: PlanResponseDto })
  update(
    @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string,
    @CurrentUser() user: SafeUser,
    @Body() input: UpdatePlanDto,
  ): Promise<PlanResponseDto> {
    return this.plansService.update(planId, user.id, input);
  }

  @Post(':planId/complete')
  @ApiOperation({ summary: 'Complete a plan' })
  @ApiOkResponse({ type: PlanResponseDto })
  complete(
    @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string,
    @CurrentUser() user: SafeUser,
  ): Promise<PlanResponseDto> {
    return this.plansService.complete(planId, user.id);
  }

  @Post(':planId/reopen')
  @ApiOperation({ summary: 'Reopen a completed plan' })
  @ApiOkResponse({ type: PlanResponseDto })
  reopen(
    @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string,
    @CurrentUser() user: SafeUser,
  ): Promise<PlanResponseDto> {
    return this.plansService.reopen(planId, user.id);
  }

  @Post(':planId/archive')
  @ApiOperation({ summary: 'Archive a plan' })
  @ApiOkResponse({ type: PlanResponseDto })
  archive(
    @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string,
    @CurrentUser() user: SafeUser,
  ): Promise<PlanResponseDto> {
    return this.plansService.archive(planId, user.id);
  }

  @Post(':planId/unarchive')
  @ApiOperation({ summary: 'Unarchive a plan to ACTIVE' })
  @ApiOkResponse({ type: PlanResponseDto })
  unarchive(
    @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string,
    @CurrentUser() user: SafeUser,
  ): Promise<PlanResponseDto> {
    return this.plansService.unarchive(planId, user.id);
  }

  @Get(':planId/participants')
  @ApiOperation({ summary: 'List plan participants' })
  @ApiOkResponse({ type: PlanParticipantResponseDto, isArray: true })
  listParticipants(
    @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string,
    @CurrentUser() user: SafeUser,
  ): Promise<PlanParticipantResponseDto[]> {
    return this.plansService.listParticipants(planId, user.id);
  }

  @Post(':planId/participants')
  @ApiOperation({ summary: 'Add an active ledger member as a participant' })
  @ApiOkResponse({ type: PlanParticipantResponseDto })
  addParticipant(
    @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string,
    @CurrentUser() user: SafeUser,
    @Body() input: AddParticipantDto,
  ): Promise<PlanParticipantResponseDto> {
    return this.plansService.addParticipant(planId, user.id, input);
  }

  @Delete(':planId/participants/:userId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a plan participant' })
  @ApiNoContentResponse()
  removeParticipant(
    @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @CurrentUser() user: SafeUser,
  ): Promise<void> {
    return this.plansService.removeParticipant(planId, userId, user.id);
  }

  @Post(':planId/move')
  @ApiOperation({
    summary: 'Move a plan after target member compatibility checks',
  })
  @ApiOkResponse({ type: PlanResponseDto })
  move(
    @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string,
    @CurrentUser() user: SafeUser,
    @Body() input: MovePlanDto,
  ): Promise<PlanResponseDto> {
    return this.plansService.move(planId, user.id, input);
  }
}
