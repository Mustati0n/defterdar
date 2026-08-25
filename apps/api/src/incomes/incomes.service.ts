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
import { ActivityLogService } from '../activity/activity-log.service.js';
import { PlanAuthorizationService } from '../plans/plan-authorization.service.js';

@Injectable()
export class IncomesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: LedgerAuthorizationService,
    private readonly plans: PlanAuthorizationService,
    private readonly activity: ActivityLogService,
  ) {}

  async create(ledgerId: string, actorId: string, dto: CreateIncomeDto) {
    const access = await this.authorization.requireMember(ledgerId, actorId);
    if (access.ledger.archivedAt)
      throw new ConflictException('Ledger is archived');
    return this.createScoped(
      ledgerId,
      dto.planId ?? null,
      access.ledger.currency,
      actorId,
      dto,
    );
  }

  async createForPlan(planId: string, actorId: string, dto: CreateIncomeDto) {
    const access = await this.plans.requireAccess(planId, actorId);
    if (!access.isParticipant) {
      throw new ForbiddenException('Only Plan participants can add income');
    }
    if (access.plan.status !== 'ACTIVE' || access.plan.archivedAt) {
      throw new ConflictException('Plan is not active');
    }
    if (dto.planId && dto.planId !== planId) {
      throw new BadRequestException('Income Plan scope cannot be overridden');
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
    dto: CreateIncomeDto,
  ) {
    await this.validatePlan(ledgerId, planId);
    await this.validateCategory(ledgerId, dto.categoryId ?? null);
    const income = await this.prisma.$transaction(async (tx) => {
      const created = await tx.income.create({
        data: {
          ledgerId,
          planId,
          createdById: actorId,
          title: dto.title.trim(),
          description: dto.description?.trim() || null,
          amountMinor: BigInt(dto.amountMinor),
          currency,
          categoryId: dto.categoryId ?? null,
          incomeDate: dto.incomeDate,
        },
        select: { id: true },
      });
      await this.activity.record(
        {
          ledgerId,
          planId,
          actorUserId: actorId,
          entityType: 'Income',
          entityId: created.id,
          action: 'income.created',
        },
        tx,
      );
      return created;
    });
    return this.get(income.id, actorId);
  }

  async listForPlan(planId: string, actorId: string) {
    const access = await this.plans.requireAccess(planId, actorId);
    const records = await this.prisma.income.findMany({
      where: { ledgerId: access.plan.ledgerId, planId },
      orderBy: [{ incomeDate: 'desc' }, { id: 'asc' }],
      select: { id: true },
    });
    return Promise.all(records.map(({ id }) => this.get(id, actorId)));
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
    const records = await this.prisma.income.findMany({
      where: { ledgerId, ...(planId ? { planId } : {}) },
      orderBy: [{ incomeDate: 'desc' }, { id: 'asc' }],
      select: { id: true },
    });
    return Promise.all(records.map(({ id }) => this.get(id, actorId)));
  }

  async get(id: string, actorId: string) {
    const income = await this.prisma.income.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!income) throw new NotFoundException('Income not found');
    await this.authorizeScope(income.ledgerId, income.planId, actorId);
    return { ...income, amountMinor: income.amountMinor.toString() };
  }

  async update(id: string, actorId: string, dto: UpdateIncomeDto) {
    const income = await this.mutable(id, actorId);
    this.manage(income, actorId);
    const planId = dto.planId === undefined ? income.planId : dto.planId;
    if (!income.ledgerId && planId !== income.planId) {
      throw new BadRequestException(
        'Standalone Income Plan scope cannot be changed',
      );
    }
    const categoryId =
      dto.categoryId === undefined ? income.categoryId : dto.categoryId;
    await this.validatePlan(income.ledgerId, planId);
    await this.validateCategory(income.ledgerId, categoryId);
    await this.prisma.$transaction(async (tx) => {
      await tx.income.update({
        where: { id },
        data: {
          title: dto.title?.trim(),
          description:
            dto.description === undefined
              ? undefined
              : dto.description?.trim() || null,
          amountMinor:
            dto.amountMinor === undefined ? undefined : BigInt(dto.amountMinor),
          planId,
          categoryId,
          incomeDate: dto.incomeDate,
        },
      });
      await this.activity.record(
        {
          ledgerId: income.ledgerId,
          planId: income.planId,
          actorUserId: actorId,
          entityType: 'Income',
          entityId: id,
          action: 'income.updated',
        },
        tx,
      );
    });
    return this.get(id, actorId);
  }

  async void(id: string, actorId: string) {
    const income = await this.mutable(id, actorId, true, true);
    this.manage(income, actorId);
    if (!income.voidedAt)
      await this.prisma.$transaction(async (tx) => {
        await tx.income.update({
          where: { id },
          data: { voidedAt: new Date() },
        });
        await this.activity.record(
          {
            ledgerId: income.ledgerId,
            planId: income.planId,
            actorUserId: actorId,
            entityType: 'Income',
            entityId: id,
            action: 'income.voided',
          },
          tx,
        );
      });
    return this.get(id, actorId);
  }

  private async mutable(
    id: string,
    actorId: string,
    allowVoided = false,
    allowInactivePlan = false,
  ) {
    const income = await this.prisma.income.findUnique({
      where: { id },
      include: { ledger: true, plan: true },
    });
    if (!income) throw new NotFoundException('Income not found');
    const access = await this.authorizeScope(
      income.ledgerId,
      income.planId,
      actorId,
    );
    if (income.ledger?.archivedAt)
      throw new ConflictException('Ledger is archived');
    if (!allowVoided && income.voidedAt)
      throw new ConflictException('Income is voided');
    if (
      !allowInactivePlan &&
      income.planId &&
      (!income.plan ||
        income.plan.status !== 'ACTIVE' ||
        income.plan.archivedAt)
    )
      throw new ConflictException('Plan is not active');
    return { ...income, role: access.role };
  }

  private manage(
    income: { createdById: string; role: string },
    actorId: string,
  ) {
    if (
      income.role === 'OWNER' ||
      income.role === 'ADMIN' ||
      income.role === 'PLAN_CREATOR' ||
      income.createdById === actorId
    )
      return;
    throw new ForbiddenException('Insufficient income permissions');
  }

  private async validatePlan(ledgerId: string | null, planId: string | null) {
    if (!planId) return;
    const plan = await this.prisma.plan.findFirst({
      where: { id: planId, ledgerId, status: 'ACTIVE', archivedAt: null },
      select: { id: true },
    });
    if (!plan)
      throw new BadRequestException('Plan must be active and belong to ledger');
  }

  private async validateCategory(
    ledgerId: string | null,
    categoryId: string | null,
  ) {
    if (!categoryId) return;
    if (!ledgerId) {
      throw new BadRequestException(
        'Standalone Plan income cannot use Ledger categories',
      );
    }
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        ledgerId,
        archivedAt: null,
        kind: { in: ['INCOME', 'BOTH'] },
      },
      select: { id: true },
    });
    if (!category) throw new BadRequestException('Income category is invalid');
  }

  private async authorizeScope(
    ledgerId: string | null,
    planId: string | null,
    actorId: string,
  ): Promise<{ role: string }> {
    if (ledgerId) return this.authorization.requireMember(ledgerId, actorId);
    if (!planId) throw new NotFoundException('Income not found');
    const access = await this.plans.requireAccess(planId, actorId);
    return { role: access.isCreator ? 'PLAN_CREATOR' : 'PARTICIPANT' };
  }
}
