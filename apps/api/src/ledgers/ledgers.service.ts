import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateLedgerDto } from './dto/create-ledger.dto.js';
import type { LedgerResponseDto } from './dto/ledger-response.dto.js';
import type { UpdateLedgerDto } from './dto/update-ledger.dto.js';
import {
  LedgerAuthorizationService,
  type LedgerAccessContext,
  type LedgerRoleName,
} from './ledger-authorization.service.js';
import { ActivityLogService } from '../activity/activity-log.service.js';

@Injectable()
export class LedgersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: LedgerAuthorizationService,
    private readonly activity: ActivityLogService,
  ) {}

  async list(
    userId: string,
    includeArchived: boolean,
  ): Promise<LedgerResponseDto[]> {
    const memberships = await this.prisma.ledgerMembership.findMany({
      where: {
        leftAt: null,
        userId,
        ledger: includeArchived ? undefined : { archivedAt: null },
      },
      select: {
        role: true,
        ledger: true,
      },
      orderBy: { joinedAt: 'asc' },
    });

    return memberships.map(({ ledger, role }) => ({ ...ledger, role }));
  }

  async get(ledgerId: string, userId: string): Promise<LedgerResponseDto> {
    return this.toResponse(
      await this.authorization.requireMember(ledgerId, userId),
    );
  }

  async createShared(
    userId: string,
    input: CreateLedgerDto,
  ): Promise<LedgerResponseDto> {
    const ledger = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.ledger.create({
        data: {
          currency: input.currency,
          description: input.description ?? null,
          name: input.name,
          ownerId: userId,
          type: 'SHARED',
        },
      });
      await transaction.ledgerMembership.create({
        data: { ledgerId: created.id, role: 'OWNER', userId },
      });
      await this.activity.record(
        { ledgerId: created.id, actorUserId: userId, entityType: 'Ledger', entityId: created.id, action: 'ledger.created' },
        transaction,
      );
      return created;
    });

    return { ...ledger, role: 'OWNER' };
  }

  async update(
    ledgerId: string,
    userId: string,
    input: UpdateLedgerDto,
  ): Promise<LedgerResponseDto> {
    const context = await this.authorization.requireRole(ledgerId, userId, [
      'OWNER',
      'ADMIN',
    ]);
    if (input.name === undefined && input.description === undefined) {
      throw new BadRequestException('At least one profile field is required');
    }

    const ledger = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.ledger.update({
        where: { id: ledgerId },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
        },
      });
      await this.activity.record(
        { ledgerId, actorUserId: userId, entityType: 'Ledger', entityId: ledgerId, action: 'ledger.updated' },
        tx,
      );
      return updated;
    });
    return { ...ledger, role: context.role };
  }

  async archive(ledgerId: string, userId: string): Promise<LedgerResponseDto> {
    const context = await this.authorization.requireRole(
      ledgerId,
      userId,
      ['OWNER'],
      { allowArchived: true },
    );
    if (context.ledger.type === 'PERSONAL') {
      throw new BadRequestException('PERSONAL ledger cannot be archived');
    }
    if (context.ledger.archivedAt) {
      return this.toResponse(context);
    }

    const ledger = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.ledger.update({ where: { id: ledgerId }, data: { archivedAt: new Date() } });
      await this.activity.record(
        { ledgerId, actorUserId: userId, entityType: 'Ledger', entityId: ledgerId, action: 'ledger.archived' },
        tx,
      );
      return updated;
    });
    return { ...ledger, role: context.role };
  }

  async unarchive(
    ledgerId: string,
    userId: string,
  ): Promise<LedgerResponseDto> {
    const context = await this.authorization.requireRole(
      ledgerId,
      userId,
      ['OWNER'],
      { allowArchived: true },
    );
    if (context.ledger.type === 'PERSONAL') {
      throw new BadRequestException('PERSONAL ledger cannot be unarchived');
    }
    if (!context.ledger.archivedAt) {
      return this.toResponse(context);
    }

    const ledger = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.ledger.update({ where: { id: ledgerId }, data: { archivedAt: null } });
      await this.activity.record(
        { ledgerId, actorUserId: userId, entityType: 'Ledger', entityId: ledgerId, action: 'ledger.unarchived' },
        tx,
      );
      return updated;
    });
    return { ...ledger, role: context.role };
  }

  private toResponse(context: LedgerAccessContext): LedgerResponseDto {
    return { ...context.ledger, role: context.role as LedgerRoleName };
  }
}
