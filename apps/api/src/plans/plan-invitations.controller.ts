import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import type { SafeUser } from '../users/dto/user-response.dto.js';
import {
  CreatedPlanInvitationResponseDto,
  CreatePlanInvitationDto,
  PlanInvitationResponseDto,
} from './dto/plan-invitation.dto.js';
import { PlanInvitationsService } from './plan-invitations.service.js';

@ApiTags('plan invitations')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard)
@Controller('plans/:planId/invitations')
export class PlanInvitationsController {
  constructor(private readonly invitations: PlanInvitationsService) {}

  @Post()
  @ApiOperation({ summary: 'Invite a registered user to a standalone Plan' })
  @ApiCreatedResponse({ type: CreatedPlanInvitationResponseDto })
  create(
    @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string,
    @CurrentUser() user: SafeUser,
    @Body() input: CreatePlanInvitationDto,
  ) {
    return this.invitations.create(planId, user.id, input);
  }

  @Get()
  @ApiOperation({ summary: 'List standalone Plan invitations' })
  @ApiOkResponse({ type: PlanInvitationResponseDto, isArray: true })
  list(
    @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string,
    @CurrentUser() user: SafeUser,
  ) {
    return this.invitations.list(planId, user.id);
  }

  @Delete(':invitationId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoke a standalone Plan invitation' })
  @ApiNoContentResponse()
  revoke(
    @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string,
    @Param('invitationId', new ParseUUIDPipe({ version: '4' }))
    invitationId: string,
    @CurrentUser() user: SafeUser,
  ) {
    return this.invitations.revoke(planId, invitationId, user.id);
  }
}
