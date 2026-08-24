import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import type { SafeUser } from '../users/dto/user-response.dto.js';
import { OverviewResponseDto } from './dto/overview-response.dto.js';
import { OverviewService } from './overview.service.js';

@ApiTags('overview')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard)
@Controller('overview')
export class OverviewController {
  constructor(private readonly overviewService: OverviewService) {}

  @Get()
  @ApiOperation({ summary: 'Read the current user Overview in one request' })
  @ApiOkResponse({ type: OverviewResponseDto })
  get(@CurrentUser() user: SafeUser): Promise<OverviewResponseDto> {
    return this.overviewService.get(user.id);
  }
}
