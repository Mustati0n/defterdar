import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { BalanceCalculator } from './balance-calculator.js';

type ProjectionClient = Pick<Prisma.TransactionClient, 'expense' | 'settlement'>;

@Injectable()
export class FinancialProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: BalanceCalculator,
  ) {}

  async positions(
    ledgerId: string,
    options: {
      planId?: string;
      excludeExpenseId?: string;
      client?: ProjectionClient;
    } = {},
  ) {
    const client = options.client ?? this.prisma;
    const [expenses, settlements] = await Promise.all([
      client.expense.findMany({
        where: {
          ledgerId,
          ...(options.planId ? { planId: options.planId } : {}),
          ...(options.excludeExpenseId
            ? { id: { not: options.excludeExpenseId } }
            : {}),
        },
        select: {
          payerId: true,
          voidedAt: true,
          splits: {
            select: { userId: true, amountMinor: true, isReimbursable: true },
          },
        },
      }),
      client.settlement.findMany({
        where: { ledgerId, ...(options.planId ? { planId: options.planId } : {}) },
        select: {
          fromUserId: true,
          toUserId: true,
          amountMinor: true,
          voidedAt: true,
        },
      }),
    ]);
    return this.calculator.project(
      expenses.map((expense) => ({
        payerId: expense.payerId,
        voided: expense.voidedAt !== null,
        splits: expense.splits,
      })),
      settlements.map((settlement) => ({
        fromUserId: settlement.fromUserId,
        toUserId: settlement.toUserId,
        amountMinor: settlement.amountMinor,
        voided: settlement.voidedAt !== null,
      })),
    );
  }

  suggestions(positions: Parameters<BalanceCalculator['suggest']>[0]) {
    return this.calculator.suggest(positions);
  }
}
