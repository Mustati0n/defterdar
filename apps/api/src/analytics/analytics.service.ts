import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { LedgerAuthorizationService } from '../ledgers/ledger-authorization.service.js';
import { BalancesService } from '../balances/balances.service.js';
import type { AnalyticsQueryDto } from './dto/analytics-query.dto.js';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: LedgerAuthorizationService,
    private readonly balances: BalancesService,
  ) {}

  async ledger(ledgerId: string, actorId: string, query: AnalyticsQueryDto) {
    const access = await this.authorization.requireMember(ledgerId, actorId);
    return this.summary(ledgerId, access.ledger.currency, actorId, query);
  }

  async plan(planId: string, actorId: string, query: AnalyticsQueryDto) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      select: { ledgerId: true, ledger: { select: { currency: true } } },
    });
    if (!plan) throw new NotFoundException('Plan not found');
    await this.authorization.requireMember(plan.ledgerId, actorId);
    return this.summary(plan.ledgerId, plan.ledger.currency, actorId, query, planId);
  }

  private async summary(
    ledgerId: string,
    currency: string,
    actorId: string,
    query: AnalyticsQueryDto,
    planId?: string,
  ) {
    if (query.from && query.to && query.from > query.to)
      throw new BadRequestException('from must be on or before to');
    const date = {
      ...(query.from ? { gte: query.from } : {}),
      ...(query.to ? { lte: query.to } : {}),
    };
    const [expenses, incomes, currentBalances] = await Promise.all([
      this.prisma.expense.findMany({
        where: {
          ledgerId,
          voidedAt: null,
          ...(planId ? { planId } : {}),
          ...(Object.keys(date).length ? { expenseDate: date } : {}),
        },
        select: {
          amountMinor: true,
          expenseDate: true,
          payerId: true,
          category: { select: { id: true, name: true } },
          splits: { select: { userId: true, amountMinor: true } },
        },
      }),
      this.prisma.income.findMany({
        where: {
          ledgerId,
          voidedAt: null,
          ...(planId ? { planId } : {}),
          ...(Object.keys(date).length ? { incomeDate: date } : {}),
        },
        select: {
          amountMinor: true,
          incomeDate: true,
          category: { select: { id: true, name: true } },
        },
      }),
      planId ? this.balances.plan(planId, actorId) : this.balances.ledger(ledgerId, actorId),
    ]);
    const totalExpense = expenses.reduce((sum, item) => sum + item.amountMinor, 0n);
    const totalIncome = incomes.reduce((sum, item) => sum + item.amountMinor, 0n);
    const categories = new Map<string, {
      category: { id: string; name: string } | null;
      expenseMinor: bigint;
      incomeMinor: bigint;
    }>();
    const monthly = new Map<string, { expenseMinor: bigint; incomeMinor: bigint }>();
    const paid = new Map<string, bigint>();
    const shares = new Map<string, bigint>();
    for (const expense of expenses) {
      this.addCategory(categories, expense.category, expense.amountMinor, 0n);
      this.addMonth(monthly, expense.expenseDate, expense.amountMinor, 0n);
      paid.set(expense.payerId, (paid.get(expense.payerId) ?? 0n) + expense.amountMinor);
      for (const split of expense.splits)
        shares.set(split.userId, (shares.get(split.userId) ?? 0n) + split.amountMinor);
    }
    for (const income of incomes) {
      this.addCategory(categories, income.category, 0n, income.amountMinor);
      this.addMonth(monthly, income.incomeDate, 0n, income.amountMinor);
    }
    const memberIds = [...new Set([...paid.keys(), ...shares.keys()])];
    const users = await this.prisma.user.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, displayName: true },
    });
    const userById = new Map(users.map((user) => [user.id, user]));
    const memberAmounts = (values: Map<string, bigint>) => [...values.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([userId, amount]) => ({ user: userById.get(userId)!, amountMinor: amount.toString() }));
    return {
      currency,
      totalExpenseMinor: totalExpense.toString(),
      totalIncomeMinor: totalIncome.toString(),
      netCashflowMinor: (totalIncome - totalExpense).toString(),
      expenseCount: expenses.length,
      incomeCount: incomes.length,
      byCategory: [...categories.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, item]) => ({ ...item, expenseMinor: item.expenseMinor.toString(), incomeMinor: item.incomeMinor.toString() })),
      monthly: [...monthly.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, item]) => ({ month, expenseMinor: item.expenseMinor.toString(), incomeMinor: item.incomeMinor.toString() })),
      paidByMember: memberAmounts(paid),
      shareByMember: memberAmounts(shares),
      currentBalances,
    };
  }

  private addCategory(
    values: Map<string, { category: { id: string; name: string } | null; expenseMinor: bigint; incomeMinor: bigint }>,
    category: { id: string; name: string } | null,
    expense: bigint,
    income: bigint,
  ) {
    const key = category?.id ?? '';
    const current = values.get(key) ?? { category, expenseMinor: 0n, incomeMinor: 0n };
    current.expenseMinor += expense;
    current.incomeMinor += income;
    values.set(key, current);
  }

  private addMonth(values: Map<string, { expenseMinor: bigint; incomeMinor: bigint }>, date: Date, expense: bigint, income: bigint) {
    const key = date.toISOString().slice(0, 7);
    const current = values.get(key) ?? { expenseMinor: 0n, incomeMinor: 0n };
    current.expenseMinor += expense;
    current.incomeMinor += income;
    values.set(key, current);
  }
}
