import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { LedgerAuthorizationService } from '../ledgers/ledger-authorization.service.js';
import { FinancialProjectionService } from '../balances/financial-projection.service.js';
import type { CreateExpenseSplitOffsetDto } from './dto/create-expense-split-offset.dto.js';

type OffsetTarget = Awaited<ReturnType<ExpenseSplitOffsetsService['target']>>;

@Injectable()
export class ExpenseSplitOffsetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: LedgerAuthorizationService,
    private readonly projection: FinancialProjectionService,
  ) {}

  async availability(expenseSplitId: string, actorId: string) {
    const target = await this.target(expenseSplitId, this.prisma);
    await this.authorization.requireMember(target.expense.ledgerId, actorId);
    const result = await this.calculateAvailability(target, this.prisma);
    return {
      ...result,
      splitAmountMinor: result.splitAmountMinor.toString(),
      offsetAppliedMinor: result.offsetAppliedMinor.toString(),
      remainingReimbursableMinor: result.remainingReimbursableMinor.toString(),
      priorSuggestionMinor: result.priorSuggestionMinor.toString(),
      maxOffsetMinor: result.maxOffsetMinor.toString(),
    };
  }

  async create(expenseSplitId: string, actorId: string, dto: CreateExpenseSplitOffsetDto) {
    const initial = await this.target(expenseSplitId, this.prisma);
    const access = await this.authorization.requireMember(initial.expense.ledgerId, actorId);
    this.canManage(initial, actorId, access.role, false);
    if (initial.expense.ledger.archivedAt)
      throw new ConflictException('Ledger is archived');
    const id = await this.serializable(async (tx) => {
      const target = await this.target(expenseSplitId, tx);
      const availability = await this.calculateAvailability(target, tx);
      if (!availability.eligible)
        throw new ConflictException(availability.reason ?? 'Offset is not available');
      const requested = dto.amountMinor === undefined ? availability.maxOffsetMinor : BigInt(dto.amountMinor);
      if (requested <= 0n || requested > availability.maxOffsetMinor)
        throw new ConflictException('Offset exceeds current availability');
      const created = await tx.expenseSplitOffset.create({
        data: { expenseSplitId, amountMinor: requested, createdById: actorId },
        select: { id: true },
      });
      return created.id;
    });
    return this.response(id, actorId);
  }

  async void(id: string, actorId: string) {
    const offset = await this.prisma.expenseSplitOffset.findUnique({
      where: { id },
      include: {
        expenseSplit: {
          include: { expense: { select: { ledgerId: true, createdById: true, payerId: true } } },
        },
      },
    });
    if (!offset) throw new NotFoundException('Expense split offset not found');
    const access = await this.authorization.requireMember(offset.expenseSplit.expense.ledgerId, actorId);
    const expense = offset.expenseSplit.expense;
    if (
      access.role !== 'OWNER' &&
      access.role !== 'ADMIN' &&
      expense.createdById !== actorId &&
      expense.payerId !== actorId &&
      offset.createdById !== actorId
    )
      throw new ForbiddenException('Insufficient offset permissions');
    if (!offset.voidedAt)
      await this.prisma.expenseSplitOffset.update({ where: { id }, data: { voidedAt: new Date() } });
    return this.response(id, actorId);
  }

  private async response(id: string, actorId: string) {
    const offset = await this.prisma.expenseSplitOffset.findUnique({
      where: { id },
      include: { expenseSplit: { include: { expense: { select: { ledgerId: true } } } } },
    });
    if (!offset) throw new NotFoundException('Expense split offset not found');
    await this.authorization.requireMember(offset.expenseSplit.expense.ledgerId, actorId);
    return {
      id: offset.id,
      expenseSplitId: offset.expenseSplitId,
      amountMinor: offset.amountMinor.toString(),
      createdById: offset.createdById,
      createdAt: offset.createdAt,
      voidedAt: offset.voidedAt,
    };
  }

  private async target(expenseSplitId: string, client: Pick<Prisma.TransactionClient, 'expenseSplit'>) {
    const target = await client.expenseSplit.findUnique({
      where: { id: expenseSplitId },
      include: {
        offsets: { where: { voidedAt: null }, select: { amountMinor: true } },
        expense: {
          include: { ledger: { select: { archivedAt: true } } },
        },
      },
    });
    if (!target) throw new NotFoundException('Expense split not found');
    return target;
  }

  private async calculateAvailability(
    target: OffsetTarget,
    client: Prisma.TransactionClient | PrismaService,
  ) {
    const applied = target.offsets.reduce((sum, item) => sum + item.amountMinor, 0n);
    const remaining = target.isReimbursable && !target.expense.voidedAt
      ? target.amountMinor - applied
      : 0n;
    let suggestion = 0n;
    if (remaining > 0n) {
      const positions = await this.projection.positions(target.expense.ledgerId, {
        planId: target.expense.planId ?? undefined,
        excludeExpenseId: target.expense.id,
        client,
      });
      suggestion = this.projection.suggestions(positions).find(
        (item) => item.fromUserId === target.expense.payerId && item.toUserId === target.userId,
      )?.amountMinor ?? 0n;
    }
    const maximum = remaining < suggestion ? remaining : suggestion;
    const reason = !target.isReimbursable
      ? 'Split is not reimbursable'
      : target.expense.voidedAt
        ? 'Expense is voided'
        : remaining <= 0n
          ? 'Split has no remaining amount'
          : suggestion <= 0n
            ? 'No prior reverse debt is available'
            : null;
    return {
      expenseSplitId: target.id,
      eligible: maximum > 0n,
      splitAmountMinor: target.amountMinor,
      offsetAppliedMinor: applied,
      remainingReimbursableMinor: remaining > 0n ? remaining : 0n,
      priorSuggestionMinor: suggestion,
      maxOffsetMinor: maximum > 0n ? maximum : 0n,
      reason,
    };
  }

  private canManage(target: OffsetTarget, actorId: string, role: string, includeCreator: boolean) {
    if (
      role === 'OWNER' ||
      role === 'ADMIN' ||
      target.expense.createdById === actorId ||
      target.expense.payerId === actorId ||
      includeCreator
    ) return;
    throw new ForbiddenException('Insufficient offset permissions');
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
