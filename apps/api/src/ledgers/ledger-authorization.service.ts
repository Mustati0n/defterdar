import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export type LedgerRoleName = 'OWNER' | 'ADMIN' | 'MEMBER';
export type LedgerTypeName = 'PERSONAL' | 'SHARED';

export interface LedgerAccessContext {
  membershipId: string;
  role: LedgerRoleName;
  ledger: {
    id: string;
    name: string;
    description: string | null;
    type: LedgerTypeName;
    currency: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date | null;
  };
}

@Injectable()
export class LedgerAuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async requireMember(
    ledgerId: string,
    userId: string,
  ): Promise<LedgerAccessContext> {
    const membership = await this.prisma.ledgerMembership.findFirst({
      where: { ledgerId, userId, leftAt: null },
      select: {
        id: true,
        role: true,
        ledger: {
          select: {
            archivedAt: true,
            createdAt: true,
            currency: true,
            description: true,
            id: true,
            name: true,
            ownerId: true,
            type: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('Ledger not found');
    }

    return {
      membershipId: membership.id,
      role: membership.role,
      ledger: membership.ledger,
    };
  }

  async requireRole(
    ledgerId: string,
    userId: string,
    allowedRoles: readonly LedgerRoleName[],
    options: { allowArchived?: boolean } = {},
  ): Promise<LedgerAccessContext> {
    const context = await this.requireMember(ledgerId, userId);

    if (!allowedRoles.includes(context.role)) {
      throw new ForbiddenException('Insufficient ledger permissions');
    }
    if (!options.allowArchived && context.ledger.archivedAt) {
      throw new ConflictException('Ledger is archived');
    }

    return context;
  }
}
