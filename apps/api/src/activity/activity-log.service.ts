import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { LedgerAuthorizationService } from '../ledgers/ledger-authorization.service.js';
import type { ActivityQueryDto } from './dto/activity-query.dto.js';

type ActivityClient = Pick<Prisma.TransactionClient, 'activityLog'>;

export interface RecordActivityInput {
  ledgerId: string | null;
  planId?: string | null;
  actorUserId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  metadata?: Prisma.InputJsonObject;
}

@Injectable()
export class ActivityLogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: LedgerAuthorizationService,
  ) {}

  record(input: RecordActivityInput, client: ActivityClient = this.prisma) {
    return client.activityLog.create({
      data: { ...input, metadata: input.metadata ?? {} },
      select: { id: true },
    });
  }

  async list(ledgerId: string, actorId: string, query: ActivityQueryDto) {
    await this.authorization.requireMember(ledgerId, actorId);
    const scope = query.planId
      ? await this.planScope(ledgerId, query.planId)
      : {};
    const rows = await this.prisma.activityLog.findMany({
      where: { ledgerId, ...scope },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: { actor: { select: { id: true, displayName: true } } },
    });
    const hasMore = rows.length > query.limit;
    const items = hasMore ? rows.slice(0, query.limit) : rows;
    return { items, nextCursor: hasMore ? items.at(-1)!.id : null };
  }

  private async planScope(
    ledgerId: string,
    planId: string,
  ): Promise<Prisma.ActivityLogWhereInput> {
    const plan = await this.prisma.plan.findFirst({
      where: { id: planId, ledgerId },
      select: { id: true },
    });
    if (!plan) throw new NotFoundException('Plan not found');

    const [expenses, incomes, settlements, attachments, offsets] =
      await Promise.all([
        this.prisma.expense.findMany({
          where: { ledgerId, planId },
          select: { id: true },
        }),
        this.prisma.income.findMany({
          where: { ledgerId, planId },
          select: { id: true },
        }),
        this.prisma.settlement.findMany({
          where: { ledgerId, planId },
          select: { id: true },
        }),
        this.prisma.expenseAttachment.findMany({
          where: { expense: { ledgerId, planId } },
          select: { id: true },
        }),
        this.prisma.expenseSplitOffset.findMany({
          where: { expenseSplit: { expense: { ledgerId, planId } } },
          select: { id: true },
        }),
      ]);

    return {
      OR: [
        { entityType: 'Plan', entityId: planId },
        {
          entityType: 'Expense',
          entityId: { in: expenses.map(({ id }) => id) },
        },
        {
          entityType: 'Income',
          entityId: { in: incomes.map(({ id }) => id) },
        },
        {
          entityType: 'Settlement',
          entityId: { in: settlements.map(({ id }) => id) },
        },
        {
          entityType: 'ExpenseAttachment',
          entityId: { in: attachments.map(({ id }) => id) },
        },
        {
          entityType: 'ExpenseSplitOffset',
          entityId: { in: offsets.map(({ id }) => id) },
        },
      ],
    };
  }
}
