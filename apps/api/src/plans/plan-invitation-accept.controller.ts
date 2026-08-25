import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { OpaqueTokenPipe } from '../common/pipes/opaque-token.pipe.js';
import type { SafeUser } from '../users/dto/user-response.dto.js';
import { AcceptedPlanInvitationResponseDto } from './dto/plan-invitation.dto.js';
import { PlanInvitationsService } from './plan-invitations.service.js';

@ApiTags('plan invitations')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard)
@Controller('plan-invitations')
export class PlanInvitationAcceptController {
  constructor(private readonly invitations: PlanInvitationsService) {}

  @Post(':token/accept')
  @ApiOperation({ summary: 'Accept an email-bound standalone Plan invitation' })
  @ApiOkResponse({ type: AcceptedPlanInvitationResponseDto })
  accept(
    @Param('token', OpaqueTokenPipe) token: string,
    @CurrentUser() user: SafeUser,
  ) {
    return this.invitations.accept(token, user);
  }
}
