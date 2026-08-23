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
import { AcceptedInvitationResponseDto } from './dto/invitation-response.dto.js';
import { LedgerInvitationsService } from './ledger-invitations.service.js';

@ApiTags('invitations')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard)
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: LedgerInvitationsService) {}

  @Post(':token/accept')
  @ApiOperation({ summary: 'Accept a valid ledger invitation' })
  @ApiOkResponse({ type: AcceptedInvitationResponseDto })
  accept(
    @Param('token', OpaqueTokenPipe) token: string,
    @CurrentUser() user: SafeUser,
  ): Promise<AcceptedInvitationResponseDto> {
    return this.invitationsService.accept(token, user);
  }
}
