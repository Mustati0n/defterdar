import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Environment } from '../config/environment.js';

const ACCESS_TOKEN_ISSUER = 'defterdar-api';
const ACCESS_TOKEN_AUDIENCE = 'defterdar-clients';

interface AccessTokenPayload {
  sub: string;
}

export interface RefreshTokenMaterial {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface OpaqueTokenMaterial {
  rawToken: string;
  tokenHash: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<Environment, true>,
  ) {}

  get accessTokenTtlSeconds(): number {
    return this.configService.get('JWT_ACCESS_TTL', { infer: true });
  }

  async createAccessToken(userId: string): Promise<string> {
    return this.jwtService.signAsync(
      {},
      {
        algorithm: 'HS256',
        audience: ACCESS_TOKEN_AUDIENCE,
        expiresIn: this.accessTokenTtlSeconds,
        issuer: ACCESS_TOKEN_ISSUER,
        secret: this.configService.get('JWT_ACCESS_SECRET', { infer: true }),
        subject: userId,
      },
    );
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    try {
      return await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
        algorithms: ['HS256'],
        audience: ACCESS_TOKEN_AUDIENCE,
        issuer: ACCESS_TOKEN_ISSUER,
        secret: this.configService.get('JWT_ACCESS_SECRET', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Unauthorized');
    }
  }

  createRefreshToken(): RefreshTokenMaterial {
    const opaqueToken = this.createOpaqueToken();
    const refreshTtlSeconds = this.configService.get('AUTH_REFRESH_TTL', {
      infer: true,
    });

    return {
      ...opaqueToken,
      expiresAt: new Date(Date.now() + refreshTtlSeconds * 1_000),
    };
  }

  createOpaqueToken(): OpaqueTokenMaterial {
    const rawToken = randomBytes(32).toString('base64url');
    return {
      rawToken,
      tokenHash: this.hashOpaqueToken(rawToken),
    };
  }

  hashOpaqueToken(rawToken: string): string {
    return createHash('sha256').update(rawToken, 'utf8').digest('hex');
  }

  hashRefreshToken(rawToken: string): string {
    return this.hashOpaqueToken(rawToken);
  }
}
