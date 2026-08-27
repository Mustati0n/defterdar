import {
  Body,
  Controller,
  Get,
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
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import type { SafeUser } from '../users/dto/user-response.dto.js';
import { CreateLedgerDto } from './dto/create-ledger.dto.js';
import {
  LedgerResponseDto,
  OwnershipTransferResponseDto,
} from './dto/ledger-response.dto.js';
import { ListLedgersQueryDto } from './dto/list-ledgers-query.dto.js';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto.js';
import { UpdateLedgerDto } from './dto/update-ledger.dto.js';
import { LedgerMembershipsService } from './ledger-memberships.service.js';
import { LedgersService } from './ledgers.service.js';

@ApiTags('ledgers')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard)
@Controller('ledgers')
export class LedgersController {
  constructor(
    private readonly ledgersService: LedgersService,
    private readonly membershipsService: LedgerMembershipsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List ledgers where the current user is active' })
  @ApiOkResponse({ type: LedgerResponseDto, isArray: true })
  list(
    @CurrentUser() user: SafeUser,
    @Query() query: ListLedgersQueryDto,
  ): Promise<LedgerResponseDto[]> {
    return this.ledgersService.list(user.id, query.includeArchived);
  }

  @Post()
  @ApiOperation({ summary: 'Create a ledger and OWNER membership' })
  @ApiCreatedResponse({ type: LedgerResponseDto })
  create(
    @CurrentUser() user: SafeUser,
    @Body() input: CreateLedgerDto,
  ): Promise<LedgerResponseDto> {
    return this.ledgersService.create(user.id, input);
  }

  @Get(':ledgerId')
  @ApiOperation({ summary: 'Read a ledger as an active member' })
  @ApiOkResponse({ type: LedgerResponseDto })
  get(
    @Param('ledgerId', new ParseUUIDPipe({ version: '4' })) ledgerId: string,
    @CurrentUser() user: SafeUser,
  ): Promise<LedgerResponseDto> {
    return this.ledgersService.get(ledgerId, user.id);
  }

  @Patch(':ledgerId')
  @ApiOperation({ summary: 'Update ledger name or description' })
  @ApiOkResponse({ type: LedgerResponseDto })
  update(
    @Param('ledgerId', new ParseUUIDPipe({ version: '4' })) ledgerId: string,
    @CurrentUser() user: SafeUser,
    @Body() input: UpdateLedgerDto,
  ): Promise<LedgerResponseDto> {
    return this.ledgersService.update(ledgerId, user.id, input);
  }

  @Post(':ledgerId/archive')
  @ApiOperation({ summary: 'Archive a ledger as OWNER' })
  @ApiOkResponse({ type: LedgerResponseDto })
  archive(
    @Param('ledgerId', new ParseUUIDPipe({ version: '4' })) ledgerId: string,
    @CurrentUser() user: SafeUser,
  ): Promise<LedgerResponseDto> {
    return this.ledgersService.archive(ledgerId, user.id);
  }

  @Post(':ledgerId/unarchive')
  @ApiOperation({ summary: 'Unarchive a ledger as OWNER' })
  @ApiOkResponse({ type: LedgerResponseDto })
  unarchive(
    @Param('ledgerId', new ParseUUIDPipe({ version: '4' })) ledgerId: string,
    @CurrentUser() user: SafeUser,
  ): Promise<LedgerResponseDto> {
    return this.ledgersService.unarchive(ledgerId, user.id);
  }

  @Post(':ledgerId/leave')
  @ApiOperation({ summary: 'Leave a ledger as ADMIN or MEMBER' })
  @ApiOkResponse({ description: 'Membership marked as left' })
  async leave(
    @Param('ledgerId', new ParseUUIDPipe({ version: '4' })) ledgerId: string,
    @CurrentUser() user: SafeUser,
  ): Promise<{ status: 'left' }> {
    await this.membershipsService.leave(ledgerId, user.id);
    return { status: 'left' };
  }

  @Post(':ledgerId/transfer-ownership')
  @ApiOperation({ summary: 'Transfer ledger ownership atomically' })
  @ApiOkResponse({ type: OwnershipTransferResponseDto })
  transferOwnership(
    @Param('ledgerId', new ParseUUIDPipe({ version: '4' })) ledgerId: string,
    @CurrentUser() user: SafeUser,
    @Body() input: TransferOwnershipDto,
  ): Promise<OwnershipTransferResponseDto> {
    return this.membershipsService.transferOwnership(ledgerId, user.id, input);
  }
}
