import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { LedgerAuthorizationService } from '../ledgers/ledger-authorization.service.js';
import { FinancialProjectionService } from '../balances/financial-projection.service.js';
import type { CreateSettlementDto } from './dto/create-settlement.dto.js';
import { ActivityLogService } from '../activity/activity-log.service.js';
import { PlanAuthorizationService } from '../plans/plan-authorization.service.js';

@Injectable()
export class SettlementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: LedgerAuthorizationService,
    private readonly plans: PlanAuthorizationService,
    private readonly projection: FinancialProjectionService,
    private readonly activity: ActivityLogService,
  ) {}

  async create(ledgerId: string, actorId: string, dto: CreateSettlementDto) {
    const access = await this.authorization.requireMember(ledgerId, actorId);
    if (access.ledger.archivedAt)
      throw new ConflictException('Ledger is archived');
    if (
      access.role !== 'OWNER' &&
      access.role !== 'ADMIN' &&
      actorId !== dto.fromUserId &&
      actorId !== dto.toUserId
    )
      throw new ForbiddenException('Insufficient settlement permissions');
    return this.createScoped(
      ledgerId,
      dto.planId ?? null,
      access.ledger.currency,
      actorId,
      dto,
    );
  }

  async createForPlan(
    planId: string,
    actorId: string,
    dto: CreateSettlementDto,
  ) {
    const access = await this.plans.requireAccess(planId, actorId);
    if (!access.isParticipant) {
      throw new ForbiddenException('Only Plan participants can settle');
    }
    if (access.plan.archivedAt || access.plan.status === 'ARCHIVED') {
      throw new ConflictException('Plan does not accept settlements');
    }
    if (
      !access.isCreator &&
      actorId !== dto.fromUserId &&
      actorId !== dto.toUserId
    ) {
      throw new ForbiddenException('Insufficient settlement permissions');
    }
    if (dto.planId && dto.planId !== planId) {
      throw new BadRequestException(
        'Settlement Plan scope cannot be overridden',
      );
    }
    return this.createScoped(
      access.plan.ledgerId,
      planId,
      access.plan.currency,
      actorId,
      dto,
    );
  }

  private async createScoped(
    ledgerId: string | null,
    planId: string | null,
    currency: string,
    actorId: string,
    dto: CreateSettlementDto,
  ) {
    if (dto.fromUserId === dto.toUserId)
      throw new BadRequestException('Settlement users must be different');

    await this.validateScopePeople(
      ledgerId,
      planId,
      dto.fromUserId,
      dto.toUserId,
    );
    const id = await this.serializable(async (tx) => {
      const positions = await this.projection.positions(ledgerId, {
        planId: planId ?? undefined,
        client: tx,
      });
      const from =
        positions.find((item) => item.userId === dto.fromUserId)?.netMinor ??
        0n;
      const to =
        positions.find((item) => item.userId === dto.toUserId)?.netMinor ?? 0n;
      const amount = BigInt(dto.amountMinor);
      if (from >= 0n) throw new ConflictException('fromUser is not a debtor');
      if (to <= 0n) throw new ConflictException('toUser is not a creditor');
      const maximum = -from < to ? -from : to;
      if (amount > maximum)
        throw new ConflictException('Settlement exceeds the current balance');
      const created = await tx.settlement.create({
        data: {
          ledgerId,
          planId,
          fromUserId: dto.fromUserId,
          toUserId: dto.toUserId,
          amountMinor: amount,
          currency,
          note: dto.note?.trim() || null,
          settledAt: dto.settledAt,
          createdById: actorId,
        },
        select: { id: true },
      });
      await this.activity.record(
        {
          ledgerId,
          planId,
          actorUserId: actorId,
          entityType: 'Settlement',
          entityId: created.id,
          action: 'settlement.created',
        },
        tx,
      );
      return created.id;
    });
    return this.get(id, actorId);
  }

  async listForPlan(planId: string, actorId: string) {
    const access = await this.plans.requireAccess(planId, actorId);
    const settlements = await this.prisma.settlement.findMany({
      where: { ledgerId: access.plan.ledgerId, planId },
      orderBy: [{ settledAt: 'desc' }, { id: 'asc' }],
      select: { id: true },
    });
    return Promise.all(settlements.map(({ id }) => this.get(id, actorId)));
  }

  async list(ledgerId: string, actorId: string, planId?: string) {
    await this.authorization.requireMember(ledgerId, actorId);
    if (planId) {
      const plan = await this.prisma.plan.findFirst({
        where: { id: planId, ledgerId },
        select: { id: true },
      });
      if (!plan)
        throw new BadRequestException('Plan does not belong to ledger');
    }
    const settlements = await this.prisma.settlement.findMany({
      where: { ledgerId, ...(planId ? { planId } : {}) },
      orderBy: [{ settledAt: 'desc' }, { id: 'asc' }],
      select: { id: true },
    });
    return Promise.all(settlements.map(({ id }) => this.get(id, actorId)));
  }

  async get(id: string, actorId: string) {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id },
      include: {
        fromUser: { select: { id: true, displayName: true } },
        toUser: { select: { id: true, displayName: true } },
      },
    });
    if (!settlement) throw new NotFoundException('Settlement not found');
    await this.authorizeScope(settlement.ledgerId, settlement.planId, actorId);
    return { ...settlement, amountMinor: settlement.amountMinor.toString() };
  }

  async void(id: string, actorId: string) {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id },
      select: {
        id: true,
        ledgerId: true,
        planId: true,
        createdById: true,
        voidedAt: true,
      },
    });
    if (!settlement) throw new NotFoundException('Settlement not found');
    const access = await this.authorizeScope(
      settlement.ledgerId,
      settlement.planId,
      actorId,
    );
    if (
      access.role !== 'OWNER' &&
      access.role !== 'ADMIN' &&
      access.role !== 'PLAN_CREATOR' &&
      settlement.createdById !== actorId
    )
      throw new ForbiddenException('Insufficient settlement permissions');
    if (!settlement.voidedAt)
      await this.prisma.$transaction(async (tx) => {
        await tx.settlement.update({
          where: { id },
          data: { voidedAt: new Date() },
        });
        await this.activity.record(
          {
            ledgerId: settlement.ledgerId,
            planId: settlement.planId,
            actorUserId: actorId,
            entityType: 'Settlement',
            entityId: id,
            action: 'settlement.voided',
          },
          tx,
        );
      });
    return this.get(id, actorId);
  }

  private async validateScopePeople(
    ledgerId: string | null,
    planId: string | null,
    fromUserId: string,
    toUserId: string,
  ) {
    const ids = [fromUserId, toUserId];
    if (ledgerId) {
      const memberships = await this.prisma.ledgerMembership.findMany({
        where: { ledgerId, userId: { in: ids } },
        select: { userId: true },
      });
      if (new Set(memberships.map((item) => item.userId)).size !== 2)
        throw new BadRequestException(
          'Settlement users must belong to ledger history',
        );
    }
    if (!planId) return;
    const plan = await this.prisma.plan.findFirst({
      where: { id: planId, ledgerId },
      select: { status: true, archivedAt: true },
    });
    if (!plan || plan.status === 'ARCHIVED' || plan.archivedAt)
      throw new ConflictException('Plan does not accept settlements');
    const participants = await this.prisma.planParticipant.findMany({
      where: { planId, userId: { in: ids } },
      select: { userId: true },
    });
    if (new Set(participants.map((item) => item.userId)).size !== 2)
      throw new BadRequestException(
        'Settlement users must be plan participants',
      );
  }

  private async authorizeScope(
    ledgerId: string | null,
    planId: string | null,
    actorId: string,
  ): Promise<{ role: string }> {
    if (ledgerId) return this.authorization.requireMember(ledgerId, actorId);
    if (!planId) throw new NotFoundException('Settlement not found');
    const access = await this.plans.requireAccess(planId, actorId);
    return { role: access.isCreator ? 'PLAN_CREATOR' : 'PARTICIPANT' };
  }

  private async serializable<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: 'Serializable',
        });
      } catch (error: unknown) {
        if (!this.isRetryable(error) || attempt === 2) throw error;
      }
    }
    throw new ConflictException('Concurrent financial update');
  }

  private isRetryable(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false;
    const code =
      'code' in error ? (error as { code?: unknown }).code : undefined;
    const cause =
      'cause' in error
        ? (error as { cause?: { originalCode?: unknown; kind?: unknown } })
            .cause
        : undefined;
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    return (
      code === 'P2034' ||
      code === '40001' ||
      cause?.originalCode === '40001' ||
      cause?.kind === 'TransactionWriteConflict' ||
      message.includes('40001') ||
      message.includes('serializ') ||
      message.includes('writeconflict')
    );
  }
}
