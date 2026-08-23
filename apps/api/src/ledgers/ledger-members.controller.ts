import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { ChangeMemberRoleDto } from './dto/change-member-role.dto.js';
import { MemberResponseDto } from './dto/member-response.dto.js';
import { LedgerMembershipsService } from './ledger-memberships.service.js';

@ApiTags('ledger memberships')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard)
@Controller('ledgers/:ledgerId/members')
export class LedgerMembersController {
  constructor(private readonly membershipsService: LedgerMembershipsService) {}

  @Get()
  @ApiOperation({ summary: 'List active ledger members' })
  @ApiOkResponse({ type: MemberResponseDto, isArray: true })
  list(
    @Param('ledgerId', new ParseUUIDPipe({ version: '4' })) ledgerId: string,
    @CurrentUser() user: SafeUser,
  ): Promise<MemberResponseDto[]> {
    return this.membershipsService.list(ledgerId, user.id);
  }

  @Patch(':userId')
  @ApiOperation({ summary: 'Change MEMBER and ADMIN roles as OWNER' })
  @ApiOkResponse({ type: MemberResponseDto })
  changeRole(
    @Param('ledgerId', new ParseUUIDPipe({ version: '4' })) ledgerId: string,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) targetUserId: string,
    @CurrentUser() user: SafeUser,
    @Body() input: ChangeMemberRoleDto,
  ): Promise<MemberResponseDto> {
    return this.membershipsService.changeRole(
      ledgerId,
      targetUserId,
      user.id,
      input,
    );
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove an ADMIN or MEMBER without hard delete' })
  @ApiNoContentResponse()
  async remove(
    @Param('ledgerId', new ParseUUIDPipe({ version: '4' })) ledgerId: string,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) targetUserId: string,
    @CurrentUser() user: SafeUser,
  ): Promise<void> {
    await this.membershipsService.remove(ledgerId, targetUserId, user.id);
  }
}
