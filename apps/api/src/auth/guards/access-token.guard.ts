import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedRequest } from '../types/authenticated-request.js';
import { TokenService } from '../token.service.js';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request.headers.authorization);
    const payload = await this.tokenService.verifyAccessToken(token);

    if (typeof payload.sub !== 'string' || !isUUID(payload.sub)) {
      throw new UnauthorizedException('Unauthorized');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        displayName: true,
        email: true,
        id: true,
        status: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Unauthorized');
    }

    request.authenticatedUser = {
      displayName: user.displayName,
      email: user.email,
      id: user.id,
    };
    return true;
  }

  private extractBearerToken(authorization: string | undefined): string {
    const [scheme, token, extra] = authorization?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !token || extra) {
      throw new UnauthorizedException('Unauthorized');
    }

    return token;
  }
}
