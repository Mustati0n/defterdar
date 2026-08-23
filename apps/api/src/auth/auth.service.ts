import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../config/environment.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { SafeUser } from '../users/dto/user-response.dto.js';
import type {
  AuthResponseDto,
  TokenResponseDto,
} from './dto/auth-response.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import { PasswordService } from './password.service.js';
import { TokenService } from './token.service.js';

const SAFE_USER_SELECT = {
  id: true,
  email: true,
  displayName: true,
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService<Environment, true>,
  ) {}

  async register(input: RegisterDto): Promise<AuthResponseDto> {
    const email = this.normalizeEmail(input.email);
    const passwordHash = await this.passwordService.hash(input.password);
    const refreshToken = this.tokenService.createRefreshToken();

    let user: SafeUser;
    try {
      user = await this.prisma.$transaction(async (transaction) => {
        const createdUser = await transaction.user.create({
          data: {
            displayName: input.displayName.trim(),
            email,
            passwordHash,
          },
          select: SAFE_USER_SELECT,
        });

        const personalLedger = await transaction.ledger.create({
          data: {
            currency: this.configService.get('DEFAULT_CURRENCY', {
              infer: true,
            }),
            name: 'Kişisel Defterim',
            ownerId: createdUser.id,
            type: 'PERSONAL',
          },
        });

        await transaction.ledgerMembership.create({
          data: {
            ledgerId: personalLedger.id,
            role: 'OWNER',
            userId: createdUser.id,
          },
        });

        await transaction.authSession.create({
          data: {
            expiresAt: refreshToken.expiresAt,
            refreshTokenHash: refreshToken.tokenHash,
            userId: createdUser.id,
          },
        });

        return createdUser;
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }

    return this.createAuthResponse(user, refreshToken.rawToken);
  }

  async login(input: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: this.normalizeEmail(input.email) },
      select: {
        ...SAFE_USER_SELECT,
        passwordHash: true,
        status: true,
      },
    });
    const passwordHash =
      user?.passwordHash ?? (await this.passwordService.getDummyHash());
    const passwordMatches = await this.passwordService.verify(
      passwordHash,
      input.password,
    );

    if (!user || !passwordMatches || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const refreshToken = this.tokenService.createRefreshToken();
    await this.prisma.authSession.create({
      data: {
        expiresAt: refreshToken.expiresAt,
        refreshTokenHash: refreshToken.tokenHash,
        userId: user.id,
      },
    });

    return this.createAuthResponse(
      {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
      refreshToken.rawToken,
    );
  }

  async refresh(rawRefreshToken: string): Promise<TokenResponseDto> {
    const now = new Date();
    const refreshTokenHash =
      this.tokenService.hashRefreshToken(rawRefreshToken);
    const session = await this.prisma.authSession.findUnique({
      where: { refreshTokenHash },
      select: {
        expiresAt: true,
        id: true,
        revokedAt: true,
        userId: true,
        user: { select: { status: true } },
      },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= now ||
      session.user.status !== 'ACTIVE'
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const nextRefreshToken = this.tokenService.createRefreshToken();
    await this.prisma.$transaction(async (transaction) => {
      const revoked = await transaction.authSession.updateMany({
        where: {
          expiresAt: { gt: now },
          id: session.id,
          revokedAt: null,
        },
        data: {
          lastUsedAt: now,
          revokedAt: now,
        },
      });

      if (revoked.count !== 1) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      await transaction.authSession.create({
        data: {
          expiresAt: nextRefreshToken.expiresAt,
          refreshTokenHash: nextRefreshToken.tokenHash,
          userId: session.userId,
        },
      });
    });

    return {
      accessToken: await this.tokenService.createAccessToken(session.userId),
      expiresIn: this.tokenService.accessTokenTtlSeconds,
      refreshToken: nextRefreshToken.rawToken,
    };
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const now = new Date();
    await this.prisma.authSession.updateMany({
      where: {
        refreshTokenHash: this.tokenService.hashRefreshToken(rawRefreshToken),
        revokedAt: null,
      },
      data: {
        lastUsedAt: now,
        revokedAt: now,
      },
    });
  }

  private async createAuthResponse(
    user: SafeUser,
    refreshToken: string,
  ): Promise<AuthResponseDto> {
    return {
      accessToken: await this.tokenService.createAccessToken(user.id),
      expiresIn: this.tokenService.accessTokenTtlSeconds,
      refreshToken,
      user,
    };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
}
