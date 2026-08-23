import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { UpdateCurrentUserDto } from './dto/update-current-user.dto.js';
import { UserResponseDto, type SafeUser } from './dto/user-response.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'A valid access token is required' })
@UseGuards(AccessTokenGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Read the current user profile' })
  @ApiOkResponse({ type: UserResponseDto })
  getCurrentUser(@CurrentUser() user: SafeUser): SafeUser {
    return user;
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update the current user display name' })
  @ApiOkResponse({ type: UserResponseDto })
  updateCurrentUser(
    @CurrentUser() user: SafeUser,
    @Body() input: UpdateCurrentUserDto,
  ): Promise<SafeUser> {
    return this.usersService.updateCurrentUser(user.id, input);
  }
}
