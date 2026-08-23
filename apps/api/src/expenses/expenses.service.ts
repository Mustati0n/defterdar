import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { LedgerAuthorizationService } from '../ledgers/ledger-authorization.service.js';
import { ExpenseSplitCalculator } from './expense-split-calculator.js';
import type { CreateExpenseDto, SplitDto } from './dto/create-expense.dto.js';
import type { UpdateExpenseDto } from './dto/update-expense.dto.js';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: LedgerAuthorizationService,
    private readonly calculator: ExpenseSplitCalculator,
  ) {}

  async create(ledgerId: string, userId: string, dto: CreateExpenseDto) {
    const access = await this.auth.requireRole(ledgerId, userId, [
      'OWNER',
      'ADMIN',
      'MEMBER',
    ]);
    const allocations = this.calculate(dto.amountMinor, dto.split);
    await this.validatePeople(
      ledgerId,
      dto.planId ?? null,
      dto.payerUserId,
      allocations.map((x) => x.userId),
    );
    const expense = await this.prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          ledgerId,
          planId: dto.planId ?? null,
          createdById: userId,
          payerId: dto.payerUserId,
          title: dto.title.trim(),
          description: dto.description?.trim() ?? null,
          amountMinor: BigInt(dto.amountMinor),
          currency: access.ledger.currency,
          splitMethod: dto.split.method,
          isGift: dto.isGift,
          expenseDate: dto.expenseDate,
        },
      });
      await tx.expenseSplit.createMany({
        data: allocations.map((x) => ({
          expenseId: created.id,
          userId: x.userId,
          amountMinor: BigInt(x.amountMinor),
          isReimbursable: !dto.isGift && x.userId !== dto.payerUserId,
        })),
      });
      return created.id;
    });
    return this.get(expense, userId);
  }
  async list(ledgerId: string, userId: string, planId?: string) {
    await this.auth.requireMember(ledgerId, userId);
    return Promise.all(
      (
        await this.prisma.expense.findMany({
          where: { ledgerId, ...(planId ? { planId } : {}) },
          orderBy: { expenseDate: 'desc' },
          select: { id: true },
        })
      ).map((x) => this.get(x.id, userId)),
    );
  }
  async get(id: string, userId: string) {
    const e = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        ledger: true,
        payer: { select: { id: true, displayName: true } },
        splits: {
          include: {
            user: { select: { id: true, displayName: true } },
            offsets: { where: { voidedAt: null }, select: { amountMinor: true } },
          },
        },
      },
    });
    if (!e) throw new NotFoundException('Expense not found');
    await this.auth.requireMember(e.ledgerId, userId);
    return {
      ...e,
      amountMinor: e.amountMinor.toString(),
      splits: e.splits.map((s) => ({
        id: s.id,
        user: s.user,
        amountMinor: s.amountMinor.toString(),
        isReimbursable: s.isReimbursable,
        offsetAppliedMinor: s.offsets
          .reduce((sum, offset) => sum + offset.amountMinor, 0n)
          .toString(),
        remainingReimbursableMinor: (s.isReimbursable && !e.voidedAt
          ? s.amountMinor - s.offsets.reduce((sum, offset) => sum + offset.amountMinor, 0n)
          : 0n
        ).toString(),
        createdAt: s.createdAt,
      })),
    };
  }
  async update(id: string, userId: string, dto: UpdateExpenseDto) {
    const old = await this.findMutable(id, userId);
    this.manage(old, userId);
    const changesFinancialFields =
      dto.amountMinor !== undefined ||
      dto.payerUserId !== undefined ||
      dto.planId !== undefined ||
      dto.isGift !== undefined ||
      dto.split !== undefined;
    if (changesFinancialFields) {
      const activeOffsets = await this.prisma.expenseSplitOffset.count({
        where: { expenseSplit: { expenseId: id }, voidedAt: null },
      });
      if (activeOffsets > 0)
        throw new ConflictException('Active offsets block financial expense updates');
    }
    if (dto.amountMinor !== undefined && !dto.split) {
      throw new BadRequestException(
        'A split is required when amountMinor changes',
      );
    }
    const amount = dto.amountMinor ?? Number(old.amountMinor);
    if (!Number.isSafeInteger(amount) || amount <= 0)
      throw new BadRequestException(
        'amountMinor must be positive safe integer',
      );
    const payer = dto.payerUserId ?? old.payerId;
    const planId = dto.planId === undefined ? old.planId : dto.planId;
    const split =
      dto.split ??
      ({
        method: 'EXACT',
        entries: (
          await this.prisma.expenseSplit.findMany({
            where: { expenseId: id },
            select: { userId: true, amountMinor: true },
          })
        ).map((s) => ({
          userId: s.userId,
          amountMinor: Number(s.amountMinor),
        })),
      } as SplitDto);
    const allocations = this.calculate(amount, split);
    await this.validatePeople(
      old.ledgerId,
      planId,
      payer,
      allocations.map((x) => x.userId),
    );
    await this.prisma.$transaction(async (tx) => {
      await tx.expense.update({
        where: { id },
        data: {
          title: dto.title?.trim(),
          description:
            dto.description === undefined
              ? undefined
              : (dto.description?.trim() ?? null),
          expenseDate: dto.expenseDate,
          amountMinor: BigInt(amount),
          payerId: payer,
          planId,
          isGift: dto.isGift,
          splitMethod: split.method,
        },
      });
      if (
        dto.split ||
        dto.amountMinor !== undefined ||
        dto.payerUserId ||
        dto.planId !== undefined ||
        dto.isGift !== undefined
      ) {
        await tx.expenseSplit.deleteMany({ where: { expenseId: id } });
        await tx.expenseSplit.createMany({
          data: allocations.map((x) => ({
            expenseId: id,
            userId: x.userId,
            amountMinor: BigInt(x.amountMinor),
            isReimbursable: !(dto.isGift ?? old.isGift) && x.userId !== payer,
          })),
        });
      }
    });
    return this.get(id, userId);
  }
  async void(id: string, userId: string) {
    const e = await this.findMutable(id, userId, true, true);
    this.manage(e, userId);
    if (!e.voidedAt) {
      const voidedAt = new Date();
      await this.prisma.$transaction(async (tx) => {
        await tx.expenseSplitOffset.updateMany({
          where: { expenseSplit: { expenseId: id }, voidedAt: null },
          data: { voidedAt },
        });
        await tx.expense.update({
          where: { id },
          data: { voidedAt },
        });
      });
    }
    return this.get(id, userId);
  }
  private async findMutable(
    id: string,
    userId: string,
    allowVoided = false,
    allowInactivePlan = false,
  ) {
    const e = await this.prisma.expense.findUnique({
      where: { id },
      include: { ledger: true, plan: true },
    });
    if (!e) throw new NotFoundException('Expense not found');
    const access = await this.auth.requireMember(e.ledgerId, userId);
    if (e.ledger.archivedAt) throw new ConflictException('Ledger is archived');
    if (!allowVoided && e.voidedAt)
      throw new ConflictException('Expense is voided');
    if (
      !allowInactivePlan &&
      e.planId &&
      (!e.plan || e.plan.status !== 'ACTIVE' || e.plan.archivedAt)
    )
      throw new ConflictException('Plan is not active');
    return { ...e, role: access.role };
  }
  private manage(e: { createdById: string; role: string }, userId: string) {
    if (e.role === 'OWNER' || e.role === 'ADMIN' || e.createdById === userId)
      return;
    throw new ForbiddenException('Insufficient expense permissions');
  }
  private calculate(amount: number, split: SplitDto) {
    if (split.method === 'EQUAL')
      return this.calculator.equal(amount, split.participantUserIds ?? []);
    if (split.method === 'EXACT')
      return this.calculator.exact(
        amount,
        (split.entries ?? []).map((x) => ({
          userId: x.userId,
          amountMinor: x.amountMinor ?? 0,
        })),
      );
    if (split.method === 'PERCENTAGE')
      return this.calculator.percentage(
        amount,
        (split.entries ?? []).map((x) => ({
          userId: x.userId,
          percentageBps: x.percentageBps ?? 0,
        })),
      );
    return this.calculator.shares(
      amount,
      (split.entries ?? []).map((x) => ({
        userId: x.userId,
        shares: x.shares ?? 0,
      })),
    );
  }
  private async validatePeople(
    ledgerId: string,
    planId: string | null,
    payer: string,
    users: string[],
  ) {
    const memberIds = [payer, ...users];
    const active = await this.prisma.ledgerMembership.findMany({
      where: { ledgerId, leftAt: null, userId: { in: memberIds } },
      select: { userId: true },
    });
    if (new Set(active.map((x) => x.userId)).size !== new Set(memberIds).size)
      throw new BadRequestException(
        'Payer and split users must be active ledger members',
      );
    if (planId) {
      const p = await this.prisma.plan.findFirst({
        where: { id: planId, ledgerId, status: 'ACTIVE', archivedAt: null },
        select: { id: true },
      });
      if (!p)
        throw new BadRequestException(
          'Plan must be active and belong to ledger',
        );
      const ps = await this.prisma.planParticipant.findMany({
        where: { planId, userId: { in: memberIds } },
        select: { userId: true },
      });
      if (new Set(ps.map((x) => x.userId)).size !== new Set(memberIds).size)
        throw new BadRequestException(
          'Payer and split users must be plan participants',
        );
    }
  }
}
