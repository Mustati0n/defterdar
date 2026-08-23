import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { CreateInvitationDto } from './dto/create-invitation.dto.js';
import {
  CreatedInvitationResponseDto,
  InvitationResponseDto,
} from './dto/invitation-response.dto.js';
import { LedgerInvitationsService } from './ledger-invitations.service.js';

@ApiTags('ledger invitations')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard)
@Controller('ledgers/:ledgerId/invitations')
export class LedgerInvitationsController {
  constructor(private readonly invitationsService: LedgerInvitationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an open or email-bound MEMBER invitation' })
  @ApiCreatedResponse({ type: CreatedInvitationResponseDto })
  create(
    @Param('ledgerId', new ParseUUIDPipe({ version: '4' })) ledgerId: string,
    @CurrentUser() user: SafeUser,
    @Body() input: CreateInvitationDto,
  ): Promise<CreatedInvitationResponseDto> {
    return this.invitationsService.create(ledgerId, user.id, input);
  }

  @Get()
  @ApiOperation({ summary: 'List invitation metadata without token hashes' })
  @ApiOkResponse({ type: InvitationResponseDto, isArray: true })
  list(
    @Param('ledgerId', new ParseUUIDPipe({ version: '4' })) ledgerId: string,
    @CurrentUser() user: SafeUser,
  ): Promise<InvitationResponseDto[]> {
    return this.invitationsService.list(ledgerId, user.id);
  }

  @Delete(':invitationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke an invitation without hard delete' })
  @ApiNoContentResponse()
  async revoke(
    @Param('ledgerId', new ParseUUIDPipe({ version: '4' })) ledgerId: string,
    @Param('invitationId', new ParseUUIDPipe({ version: '4' }))
    invitationId: string,
    @CurrentUser() user: SafeUser,
  ): Promise<void> {
    await this.invitationsService.revoke(ledgerId, invitationId, user.id);
  }
}
