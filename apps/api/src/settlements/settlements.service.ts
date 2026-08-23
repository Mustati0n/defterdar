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

@Injectable()
export class SettlementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: LedgerAuthorizationService,
    private readonly projection: FinancialProjectionService,
  ) {}

  async create(ledgerId: string, actorId: string, dto: CreateSettlementDto) {
    const access = await this.authorization.requireMember(ledgerId, actorId);
    if (access.ledger.archivedAt) throw new ConflictException('Ledger is archived');
    if (dto.fromUserId === dto.toUserId)
      throw new BadRequestException('Settlement users must be different');
    if (
      access.role !== 'OWNER' &&
      access.role !== 'ADMIN' &&
      actorId !== dto.fromUserId &&
      actorId !== dto.toUserId
    )
      throw new ForbiddenException('Insufficient settlement permissions');

    await this.validateScopePeople(
      ledgerId,
      dto.planId ?? null,
      dto.fromUserId,
      dto.toUserId,
    );
    const id = await this.serializable(async (tx) => {
      const positions = await this.projection.positions(ledgerId, {
        planId: dto.planId ?? undefined,
        client: tx,
      });
      const from = positions.find((item) => item.userId === dto.fromUserId)?.netMinor ?? 0n;
      const to = positions.find((item) => item.userId === dto.toUserId)?.netMinor ?? 0n;
      const amount = BigInt(dto.amountMinor);
      if (from >= 0n) throw new ConflictException('fromUser is not a debtor');
      if (to <= 0n) throw new ConflictException('toUser is not a creditor');
      const maximum = -from < to ? -from : to;
      if (amount > maximum)
        throw new ConflictException('Settlement exceeds the current balance');
      const created = await tx.settlement.create({
        data: {
          ledgerId,
          planId: dto.planId ?? null,
          fromUserId: dto.fromUserId,
          toUserId: dto.toUserId,
          amountMinor: amount,
          currency: access.ledger.currency,
          note: dto.note?.trim() || null,
          settledAt: dto.settledAt,
          createdById: actorId,
        },
        select: { id: true },
      });
      return created.id;
    });
    return this.get(id, actorId);
  }

  async list(ledgerId: string, actorId: string, planId?: string) {
    await this.authorization.requireMember(ledgerId, actorId);
    if (planId) {
      const plan = await this.prisma.plan.findFirst({ where: { id: planId, ledgerId }, select: { id: true } });
      if (!plan) throw new BadRequestException('Plan does not belong to ledger');
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
    await this.authorization.requireMember(settlement.ledgerId, actorId);
    return { ...settlement, amountMinor: settlement.amountMinor.toString() };
  }

  async void(id: string, actorId: string) {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id },
      select: { id: true, ledgerId: true, createdById: true, voidedAt: true },
    });
    if (!settlement) throw new NotFoundException('Settlement not found');
    const access = await this.authorization.requireMember(settlement.ledgerId, actorId);
    if (
      access.role !== 'OWNER' &&
      access.role !== 'ADMIN' &&
      settlement.createdById !== actorId
    )
      throw new ForbiddenException('Insufficient settlement permissions');
    if (!settlement.voidedAt)
      await this.prisma.settlement.update({ where: { id }, data: { voidedAt: new Date() } });
    return this.get(id, actorId);
  }

  private async validateScopePeople(
    ledgerId: string,
    planId: string | null,
    fromUserId: string,
    toUserId: string,
  ) {
    const ids = [fromUserId, toUserId];
    const memberships = await this.prisma.ledgerMembership.findMany({
      where: { ledgerId, userId: { in: ids } },
      select: { userId: true },
    });
    if (new Set(memberships.map((item) => item.userId)).size !== 2)
      throw new BadRequestException('Settlement users must belong to ledger history');
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
      throw new BadRequestException('Settlement users must be plan participants');
  }

  private async serializable<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(operation, { isolationLevel: 'Serializable' });
      } catch (error: unknown) {
        if (!this.isRetryable(error) || attempt === 2) throw error;
      }
    }
    throw new ConflictException('Concurrent financial update');
  }

  private isRetryable(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false;
    const code = 'code' in error ? (error as { code?: unknown }).code : undefined;
    const cause = 'cause' in error
      ? (error as { cause?: { originalCode?: unknown; kind?: unknown } }).cause
      : undefined;
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    return code === 'P2034' || code === '40001' || cause?.originalCode === '40001' ||
      cause?.kind === 'TransactionWriteConflict' || message.includes('40001') ||
      message.includes('serializ') || message.includes('writeconflict');
  }
}
