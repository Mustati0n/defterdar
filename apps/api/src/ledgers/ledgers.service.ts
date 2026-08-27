import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
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

const MEMBER_COUNT_SELECT = {
  _count: {
    select: {
      memberships: { where: { leftAt: null } },
      plans: { where: { archivedAt: null, status: 'ACTIVE' } },
    },
  },
} as const;

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
        ledger: {
          include: {
            _count: {
              select: {
                memberships: { where: { leftAt: null } },
                plans: {
                  where: { archivedAt: null, status: 'ACTIVE' },
                },
              },
            },
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return memberships.map(({ ledger, role }) => {
      const { _count, ...data } = ledger;
      return {
        ...data,
        role,
        activeMemberCount: _count.memberships,
        activePlanCount: _count.plans,
        isCollaborative: _count.memberships > 1,
      };
    });
  }

  async get(ledgerId: string, userId: string): Promise<LedgerResponseDto> {
    const context = await this.authorization.requireMember(ledgerId, userId);
    const counts = await this.prisma.ledger.findUniqueOrThrow({
      where: { id: ledgerId },
      include: MEMBER_COUNT_SELECT,
    });
    return {
      ...context.ledger,
      role: context.role,
      activeMemberCount: counts._count.memberships,
      activePlanCount: counts._count.plans,
      isCollaborative: counts._count.memberships > 1,
    };
  }

  async create(
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
        },
        select: { id: true },
      });
      await transaction.ledgerMembership.create({
        data: { ledgerId: created.id, role: 'OWNER', userId },
      });
      await this.activity.record(
        {
          ledgerId: created.id,
          actorUserId: userId,
          entityType: 'Ledger',
          entityId: created.id,
          action: 'ledger.created',
        },
        transaction,
      );
      const full = await transaction.ledger.findUniqueOrThrow({
        where: { id: created.id },
        include: MEMBER_COUNT_SELECT,
      });
      return full;
    });

    return this.mapCounts(ledger, 'OWNER');
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
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
        },
        include: MEMBER_COUNT_SELECT,
      });
      await this.activity.record(
        {
          ledgerId,
          actorUserId: userId,
          entityType: 'Ledger',
          entityId: ledgerId,
          action: 'ledger.updated',
        },
        tx,
      );
      return updated;
    });
    return this.mapCounts(ledger, context.role);
  }

  async archive(ledgerId: string, userId: string): Promise<LedgerResponseDto> {
    const context = await this.authorization.requireRole(
      ledgerId,
      userId,
      ['OWNER'],
      { allowArchived: true },
    );
    if (context.ledger.archivedAt) {
      return this.toResponse(context);
    }

    const ledger = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.ledger.update({
        where: { id: ledgerId },
        data: { archivedAt: new Date() },
        include: MEMBER_COUNT_SELECT,
      });
      await this.activity.record(
        {
          ledgerId,
          actorUserId: userId,
          entityType: 'Ledger',
          entityId: ledgerId,
          action: 'ledger.archived',
        },
        tx,
      );
      return updated;
    });
    return this.mapCounts(ledger, context.role);
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
    if (!context.ledger.archivedAt) {
      return this.toResponse(context);
    }

    const ledger = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.ledger.update({
        where: { id: ledgerId },
        data: { archivedAt: null },
        include: MEMBER_COUNT_SELECT,
      });
      await this.activity.record(
        {
          ledgerId,
          actorUserId: userId,
          entityType: 'Ledger',
          entityId: ledgerId,
          action: 'ledger.unarchived',
        },
        tx,
      );
      return updated;
    });
    return this.mapCounts(ledger, context.role);
  }

  private toResponse(context: LedgerAccessContext): LedgerResponseDto {
    return { ...context.ledger, role: context.role as LedgerRoleName };
  }

  private mapCounts(
    ledger: {
      _count: {
        memberships: number;
        plans: number;
      };
    } & Record<string, unknown>,
    role: LedgerRoleName,
  ): LedgerResponseDto {
    const { _count, ...data } = ledger;
    return {
      ...(data as Record<string, unknown>),
      role,
      activeMemberCount: _count.memberships,
      activePlanCount: _count.plans,
      isCollaborative: _count.memberships > 1,
    } as LedgerResponseDto;
  }
}
