import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { UpdateCurrentUserDto } from './dto/update-current-user.dto.js';
import type { SafeUser } from './dto/user-response.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updateCurrentUser(
    userId: string,
    input: UpdateCurrentUserDto,
  ): Promise<SafeUser> {
    const updated = await this.prisma.user.updateMany({
      where: { id: userId, status: 'ACTIVE' },
      data: { displayName: input.displayName.trim() },
    });

    if (updated.count !== 1) {
      throw new UnauthorizedException('Unauthorized');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true, email: true, id: true },
    });

    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }

    return user;
  }
}
