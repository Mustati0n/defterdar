import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { LedgerAuthorizationService } from '../ledgers/ledger-authorization.service.js';
import type { CreateIncomeDto } from './dto/create-income.dto.js';
import type { UpdateIncomeDto } from './dto/update-income.dto.js';

@Injectable()
export class IncomesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: LedgerAuthorizationService,
  ) {}

  async create(ledgerId: string, actorId: string, dto: CreateIncomeDto) {
    const access = await this.authorization.requireMember(ledgerId, actorId);
    if (access.ledger.archivedAt) throw new ConflictException('Ledger is archived');
    await this.validatePlan(ledgerId, dto.planId ?? null);
    await this.validateCategory(ledgerId, dto.categoryId ?? null);
    const income = await this.prisma.income.create({
      data: {
        ledgerId,
        planId: dto.planId ?? null,
        createdById: actorId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        amountMinor: BigInt(dto.amountMinor),
        currency: access.ledger.currency,
        categoryId: dto.categoryId ?? null,
        incomeDate: dto.incomeDate,
      },
      select: { id: true },
    });
    return this.get(income.id, actorId);
  }

  async list(ledgerId: string, actorId: string, planId?: string) {
    await this.authorization.requireMember(ledgerId, actorId);
    if (planId) {
      const plan = await this.prisma.plan.findFirst({ where: { id: planId, ledgerId }, select: { id: true } });
      if (!plan) throw new BadRequestException('Plan does not belong to ledger');
    }
    const records = await this.prisma.income.findMany({
      where: { ledgerId, ...(planId ? { planId } : {}) },
      orderBy: [{ incomeDate: 'desc' }, { id: 'asc' }],
      select: { id: true },
    });
    return Promise.all(records.map(({ id }) => this.get(id, actorId)));
  }

  async get(id: string, actorId: string) {
    const income = await this.prisma.income.findUnique({ where: { id }, include: { category: true } });
    if (!income) throw new NotFoundException('Income not found');
    await this.authorization.requireMember(income.ledgerId, actorId);
    return { ...income, amountMinor: income.amountMinor.toString() };
  }

  async update(id: string, actorId: string, dto: UpdateIncomeDto) {
    const income = await this.mutable(id, actorId);
    this.manage(income, actorId);
    const planId = dto.planId === undefined ? income.planId : dto.planId;
    const categoryId = dto.categoryId === undefined ? income.categoryId : dto.categoryId;
    await this.validatePlan(income.ledgerId, planId);
    await this.validateCategory(income.ledgerId, categoryId);
    await this.prisma.income.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        description: dto.description === undefined ? undefined : dto.description?.trim() || null,
        amountMinor: dto.amountMinor === undefined ? undefined : BigInt(dto.amountMinor),
        planId,
        categoryId,
        incomeDate: dto.incomeDate,
      },
    });
    return this.get(id, actorId);
  }

  async void(id: string, actorId: string) {
    const income = await this.mutable(id, actorId, true, true);
    this.manage(income, actorId);
    if (!income.voidedAt)
      await this.prisma.income.update({ where: { id }, data: { voidedAt: new Date() } });
    return this.get(id, actorId);
  }

  private async mutable(id: string, actorId: string, allowVoided = false, allowInactivePlan = false) {
    const income = await this.prisma.income.findUnique({
      where: { id },
      include: { ledger: true, plan: true },
    });
    if (!income) throw new NotFoundException('Income not found');
    const access = await this.authorization.requireMember(income.ledgerId, actorId);
    if (income.ledger.archivedAt) throw new ConflictException('Ledger is archived');
    if (!allowVoided && income.voidedAt) throw new ConflictException('Income is voided');
    if (!allowInactivePlan && income.planId &&
      (!income.plan || income.plan.status !== 'ACTIVE' || income.plan.archivedAt))
      throw new ConflictException('Plan is not active');
    return { ...income, role: access.role };
  }

  private manage(income: { createdById: string; role: string }, actorId: string) {
    if (income.role === 'OWNER' || income.role === 'ADMIN' || income.createdById === actorId) return;
    throw new ForbiddenException('Insufficient income permissions');
  }

  private async validatePlan(ledgerId: string, planId: string | null) {
    if (!planId) return;
    const plan = await this.prisma.plan.findFirst({
      where: { id: planId, ledgerId, status: 'ACTIVE', archivedAt: null },
      select: { id: true },
    });
    if (!plan) throw new BadRequestException('Plan must be active and belong to ledger');
  }

  private async validateCategory(ledgerId: string, categoryId: string | null) {
    if (!categoryId) return;
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, ledgerId, archivedAt: null, kind: { in: ['INCOME', 'BOTH'] } },
      select: { id: true },
    });
    if (!category) throw new BadRequestException('Income category is invalid');
  }
}
