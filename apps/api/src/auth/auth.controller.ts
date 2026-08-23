import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service.js';
import { AuthResponseDto, TokenResponseDto } from './dto/auth-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@ApiTags('authentication')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Register and open an authenticated session' })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiConflictResponse({ description: 'Email is already registered' })
  register(@Body() input: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(input);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Authenticate with email and password' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  login(@Body() input: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(input);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Rotate a refresh token and issue new tokens' })
  @ApiOkResponse({ type: TokenResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid refresh token' })
  refresh(@Body() input: RefreshTokenDto): Promise<TokenResponseDto> {
    return this.authService.refresh(input.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Revoke a refresh session' })
  @ApiNoContentResponse({ description: 'Session revoked or already absent' })
  async logout(@Body() input: RefreshTokenDto): Promise<void> {
    await this.authService.logout(input.refreshToken);
  }
}
