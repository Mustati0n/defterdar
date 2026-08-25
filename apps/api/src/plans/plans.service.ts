import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivityLogService } from '../activity/activity-log.service.js';
import { Prisma } from '../generated/prisma/client.js';
import {
  LedgerAuthorizationService,
  type LedgerAccessContext,
  type LedgerRoleName,
} from '../ledgers/ledger-authorization.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { SafeUser } from '../users/dto/user-response.dto.js';
import type { AddParticipantDto } from './dto/add-participant.dto.js';
import type { CreatePlanDto } from './dto/create-plan.dto.js';
import type { CreateStandalonePlanDto } from './dto/create-standalone-plan.dto.js';
import type { LinkPlanLedgerDto } from './dto/link-plan-ledger.dto.js';
import type { ListPlansQueryDto } from './dto/list-plans-query.dto.js';
import type { MovePlanDto } from './dto/move-plan.dto.js';
import type {
  PlanParticipantResponseDto,
  PlanResponseDto,
} from './dto/plan-response.dto.js';
import type { UpdatePlanDto } from './dto/update-plan.dto.js';

const PLAN_SELECT = {
  archivedAt: true,
  createdAt: true,
  createdById: true,
  currency: true,
  description: true,
  endsAt: true,
  id: true,
  ledgerId: true,
  name: true,
  startsAt: true,
  status: true,
  updatedAt: true,
  _count: { select: { participants: true } },
} as const;

const PARTICIPANT_SELECT = {
  createdAt: true,
  user: { select: { displayName: true, id: true } },
} as const;

type PlanRow = Prisma.PlanGetPayload<{ select: typeof PLAN_SELECT }>;
type AccessiblePlan = PlanRow & {
  ledger: LedgerAccessContext['ledger'] | null;
  role: LedgerRoleName | null;
  isParticipant: boolean;
};

@Injectable()
export class PlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: LedgerAuthorizationService,
    private readonly activity: ActivityLogService,
  ) {}

  async create(
    ledgerId: string,
    user: SafeUser,
    input: CreatePlanDto,
  ): Promise<PlanResponseDto> {
    const access = await this.authorization.requireRole(ledgerId, user.id, [
      'OWNER',
      'ADMIN',
      'MEMBER',
    ]);
    this.validateDates(input.startsAt ?? null, input.endsAt ?? null);
    return this.createPlan(
      { ...input, currency: access.ledger.currency, ledgerId },
      user.id,
    );
  }

  async createStandalone(
    user: SafeUser,
    input: CreateStandalonePlanDto,
  ): Promise<PlanResponseDto> {
    this.validateDates(input.startsAt ?? null, input.endsAt ?? null);
    return this.createPlan({ ...input, ledgerId: null }, user.id);
  }

  async list(
    ledgerId: string,
    userId: string,
    query: ListPlansQueryDto,
  ): Promise<PlanResponseDto[]> {
    await this.authorization.requireMember(ledgerId, userId);
    const plans = await this.prisma.plan.findMany({
      where: {
        ledgerId,
        ...(query.includeArchived ? {} : { archivedAt: null }),
      },
      select: PLAN_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    return plans.map((plan) => this.toResponse(plan));
  }

  async listForUser(
    userId: string,
    includeArchived: boolean,
  ): Promise<PlanResponseDto[]> {
    const plans = await this.prisma.plan.findMany({
      where: {
        ...(includeArchived ? {} : { archivedAt: null }),
        OR: [
          {
            ledger: {
              archivedAt: null,
              memberships: { some: { leftAt: null, userId } },
            },
          },
          { ledgerId: null, participants: { some: { userId } } },
        ],
      },
      select: PLAN_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    return plans.map((plan) => this.toResponse(plan));
  }

  async get(planId: string, userId: string): Promise<PlanResponseDto> {
    return this.toResponse(await this.requireAccessiblePlan(planId, userId));
  }

  async update(
    planId: string,
    userId: string,
    input: UpdatePlanDto,
  ): Promise<PlanResponseDto> {
    const plan = await this.requireMutablePlan(planId, userId);
    this.requireManagePermission(plan, userId, true);
    if (
      input.name === undefined &&
      input.description === undefined &&
      input.startsAt === undefined &&
      input.endsAt === undefined &&
      input.currency === undefined
    ) {
      throw new BadRequestException('At least one plan field is required');
    }
    if (plan.ledgerId && input.currency !== undefined) {
      throw new BadRequestException(
        'Ledger-bound Plan currency cannot be overridden',
      );
    }
    if (input.currency && input.currency !== plan.currency) {
      if ((await this.countPlanFinance(planId)) > 0) {
        throw new ConflictException(
          'Plan currency cannot change after financial history exists',
        );
      }
    }

    const startsAt =
      input.startsAt === undefined ? plan.startsAt : input.startsAt;
    const endsAt = input.endsAt === undefined ? plan.endsAt : input.endsAt;
    this.validateDates(startsAt, endsAt);
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.plan.update({
        where: { id: planId },
        data: {
          ...(input.currency === undefined ? {} : { currency: input.currency }),
          ...(input.name === undefined
            ? {}
            : { name: this.normalizeName(input.name) }),
          ...(input.description === undefined
            ? {}
            : {
                description: this.normalizeNullableText(input.description),
              }),
          ...(input.startsAt === undefined ? {} : { startsAt: input.startsAt }),
          ...(input.endsAt === undefined ? {} : { endsAt: input.endsAt }),
        },
        select: PLAN_SELECT,
      });
      await this.recordActivity(plan, userId, 'plan.updated', tx);
      return result;
    });
    return this.toResponse(updated);
  }

  async complete(planId: string, userId: string): Promise<PlanResponseDto> {
    const plan = await this.requireMutablePlan(planId, userId);
    this.requireManagePermission(plan, userId, true);
    if (plan.status === 'COMPLETED') return this.toResponse(plan);
    return this.toResponse(
      await this.planStateChange(
        plan,
        userId,
        { status: 'COMPLETED' },
        'plan.completed',
      ),
    );
  }

  async reopen(planId: string, userId: string): Promise<PlanResponseDto> {
    const plan = await this.requireAccessiblePlan(planId, userId);
    this.requireScopeOpen(plan);
    this.requireManagePermission(plan, userId, false);
    if (plan.status === 'ACTIVE') return this.toResponse(plan);
    return this.toResponse(
      await this.planStateChange(
        plan,
        userId,
        { status: 'ACTIVE' },
        'plan.reopened',
      ),
    );
  }

  async archive(planId: string, userId: string): Promise<PlanResponseDto> {
    const plan = await this.requireAccessiblePlan(planId, userId);
    this.requireScopeOpen(plan);
    this.requireManagePermission(plan, userId, false);
    if (plan.archivedAt) return this.toResponse(plan);
    return this.toResponse(
      await this.planStateChange(
        plan,
        userId,
        { archivedAt: new Date(), status: 'ARCHIVED' },
        'plan.archived',
      ),
    );
  }

  async unarchive(planId: string, userId: string): Promise<PlanResponseDto> {
    const plan = await this.requireAccessiblePlan(planId, userId);
    this.requireScopeOpen(plan);
    this.requireManagePermission(plan, userId, false);
    if (!plan.archivedAt) return this.toResponse(plan);
    return this.toResponse(
      await this.planStateChange(
        plan,
        userId,
        { archivedAt: null, status: 'ACTIVE' },
        'plan.reopened',
      ),
    );
  }

  async listParticipants(
    planId: string,
    userId: string,
  ): Promise<PlanParticipantResponseDto[]> {
    await this.requireAccessiblePlan(planId, userId);
    const participants = await this.prisma.planParticipant.findMany({
      where: { planId, userId: { not: null } },
      select: PARTICIPANT_SELECT,
      orderBy: { createdAt: 'asc' },
    });
    return participants.filter(
      (participant): participant is PlanParticipantResponseDto =>
        participant.user !== null,
    );
  }

  async addParticipant(
    planId: string,
    actorId: string,
    input: AddParticipantDto,
  ): Promise<PlanParticipantResponseDto> {
    const plan = await this.requireMutablePlan(planId, actorId);
    this.requireParticipantPermission(plan, actorId);
    if (plan.ledgerId) {
      const member = await this.prisma.ledgerMembership.findFirst({
        where: { ledgerId: plan.ledgerId, leftAt: null, userId: input.userId },
        select: { id: true },
      });
      if (!member) {
        throw new BadRequestException(
          'Participant must be an active ledger member',
        );
      }
    } else {
      const user = await this.prisma.user.findFirst({
        where: { id: input.userId, status: 'ACTIVE' },
        select: { id: true },
      });
      if (!user) throw new BadRequestException('Participant must be active');
    }
    try {
      const participant = await this.prisma.planParticipant.create({
        data: { planId, userId: input.userId },
        select: PARTICIPANT_SELECT,
      });
      if (!participant.user) {
        throw new ConflictException('Participant user missing');
      }
      return { createdAt: participant.createdAt, user: participant.user };
    } catch (error) {
      if (this.hasPrismaCode(error, 'P2002')) {
        throw new ConflictException('User is already a plan participant');
      }
      throw error;
    }
  }

  async removeParticipant(
    planId: string,
    targetUserId: string,
    actorId: string,
  ): Promise<void> {
    const plan = await this.requireMutablePlan(planId, actorId);
    this.requireParticipantPermission(plan, actorId);
    if (!plan.ledgerId && targetUserId === plan.createdById) {
      throw new ConflictException('Plan creator cannot be removed');
    }
    const participant = await this.prisma.planParticipant.findFirst({
      where: { planId, userId: targetUserId },
      select: { id: true },
    });
    if (!participant) throw new NotFoundException('Participant not found');
    await this.prisma.planParticipant.delete({ where: { id: participant.id } });
  }

  async move(
    planId: string,
    actorId: string,
    input: MovePlanDto,
  ): Promise<PlanResponseDto> {
    const plan = await this.requireAccessiblePlan(planId, actorId);
    if (!plan.ledgerId) {
      throw new BadRequestException('Use link-ledger for a standalone Plan');
    }
    this.requireMutableForMove(plan);
    if (plan.role !== 'OWNER') {
      throw new ForbiddenException(
        'Only the source ledger OWNER can move a plan',
      );
    }
    if (input.targetLedgerId === plan.ledgerId) {
      throw new BadRequestException(
        'Target ledger must differ from source ledger',
      );
    }
    return this.moveToLedger(plan, actorId, input.targetLedgerId);
  }

  async linkLedger(
    planId: string,
    actorId: string,
    input: LinkPlanLedgerDto,
  ): Promise<PlanResponseDto> {
    const plan = await this.requireAccessiblePlan(planId, actorId);
    if (plan.ledgerId) {
      throw new BadRequestException('Plan is already linked to a Ledger');
    }
    this.requireMutableForMove(plan);
    if (plan.createdById !== actorId) {
      throw new ForbiddenException('Only the Plan creator can link a Ledger');
    }
    return this.moveToLedger(plan, actorId, input.ledgerId);
  }

  private async createPlan(
    input: CreatePlanDto & { currency: string; ledgerId: string | null },
    creatorId: string,
  ): Promise<PlanResponseDto> {
    const plan = await this.prisma.$transaction(async (tx) => {
      const created = await tx.plan.create({
        data: {
          createdById: creatorId,
          currency: input.currency,
          description: this.normalizeNullableText(input.description),
          endsAt: input.endsAt ?? null,
          ledgerId: input.ledgerId,
          name: this.normalizeName(input.name),
          startsAt: input.startsAt ?? null,
          status: 'ACTIVE',
        },
        select: { id: true },
      });
      await tx.planParticipant.create({
        data: { planId: created.id, userId: creatorId },
      });
      await this.activity.record(
        {
          ledgerId: input.ledgerId,
          planId: created.id,
          actorUserId: creatorId,
          entityType: 'Plan',
          entityId: created.id,
          action: 'plan.created',
        },
        tx,
      );
      return tx.plan.findUniqueOrThrow({
        where: { id: created.id },
        select: PLAN_SELECT,
      });
    });
    return this.toResponse(plan);
  }

  private async moveToLedger(
    accessible: AccessiblePlan,
    actorId: string,
    targetLedgerId: string,
  ): Promise<PlanResponseDto> {
    try {
      const moved = await this.prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`
            SELECT "id" FROM "Plan" WHERE "id" = ${accessible.id}::uuid FOR UPDATE
          `;
          await tx.$queryRaw`
            SELECT "id" FROM "Ledger" WHERE "id" = ${targetLedgerId}::uuid FOR UPDATE
          `;
          const fresh = await tx.plan.findUnique({
            where: { id: accessible.id },
            select: {
              archivedAt: true,
              currency: true,
              ledgerId: true,
              status: true,
            },
          });
          if (!fresh || fresh.ledgerId !== accessible.ledgerId) {
            throw new ConflictException(
              'Plan changed while it was being linked',
            );
          }
          if (
            fresh.archivedAt ||
            fresh.status !== 'ACTIVE' ||
            accessible.ledger?.archivedAt
          ) {
            throw new ConflictException('Only an active Plan can be linked');
          }
          const targetAccess = await tx.ledgerMembership.findFirst({
            where: {
              ledgerId: targetLedgerId,
              leftAt: null,
              role: { in: ['OWNER', 'ADMIN'] },
              userId: actorId,
            },
            select: {
              ledger: { select: { archivedAt: true, currency: true } },
            },
          });
          if (!targetAccess) {
            throw new ForbiddenException(
              'Required target Ledger access is missing',
            );
          }
          if (targetAccess.ledger.archivedAt) {
            throw new ConflictException('Target Ledger is archived');
          }
          if (targetAccess.ledger.currency !== fresh.currency) {
            throw new ConflictException(
              'Plan and Ledger currencies must match',
            );
          }
          const participantRows = await tx.planParticipant.findMany({
            where: { planId: accessible.id, userId: { not: null } },
            select: { userId: true },
          });
          const participantIds = participantRows
            .map(({ userId }) => userId)
            .filter((userId): userId is string => userId !== null);
          if (participantIds.length > 0) {
            await tx.$queryRaw`
              SELECT "id" FROM "LedgerMembership"
              WHERE "ledgerId" = ${targetLedgerId}::uuid
                AND "userId" IN (${Prisma.join(
                  participantIds.map((id) => Prisma.sql`${id}::uuid`),
                )})
                AND "leftAt" IS NULL
              FOR SHARE
            `;
          }
          const memberships = await tx.ledgerMembership.findMany({
            where: {
              ledgerId: targetLedgerId,
              leftAt: null,
              userId: { in: participantIds },
            },
            select: { userId: true },
          });
          const activeIds = new Set(memberships.map(({ userId }) => userId));
          const missingIds = participantIds.filter((id) => !activeIds.has(id));
          if (missingIds.length) {
            throw new ConflictException({
              message:
                'Some Plan participants are not members of the target Ledger',
              userIds: missingIds,
            });
          }
          await Promise.all([
            tx.expense.updateMany({
              where: { planId: accessible.id },
              data: { ledgerId: targetLedgerId },
            }),
            tx.income.updateMany({
              where: { planId: accessible.id },
              data: { ledgerId: targetLedgerId },
            }),
            tx.settlement.updateMany({
              where: { planId: accessible.id },
              data: { ledgerId: targetLedgerId },
            }),
          ]);
          const updated = await tx.plan.update({
            where: { id: accessible.id },
            data: { ledgerId: targetLedgerId },
            select: PLAN_SELECT,
          });
          if (accessible.ledgerId) {
            await this.activity.record(
              {
                ledgerId: accessible.ledgerId,
                planId: accessible.id,
                actorUserId: actorId,
                entityType: 'Plan',
                entityId: accessible.id,
                action: 'plan.moved_out',
                metadata: { targetLedgerId },
              },
              tx,
            );
          }
          await this.activity.record(
            {
              ledgerId: targetLedgerId,
              planId: accessible.id,
              actorUserId: actorId,
              entityType: 'Plan',
              entityId: accessible.id,
              action: accessible.ledgerId ? 'plan.moved_in' : 'plan.linked',
              metadata: { sourceLedgerId: accessible.ledgerId },
            },
            tx,
          );
          return updated;
        },
        { isolationLevel: 'Serializable' },
      );
      return this.toResponse(moved);
    } catch (error) {
      if (this.hasPrismaCode(error, 'P2034')) {
        throw new ConflictException('Plan link conflicted');
      }
      throw error;
    }
  }

  private async requireAccessiblePlan(
    planId: string,
    userId: string,
  ): Promise<AccessiblePlan> {
    const plan = await this.findPlan(planId);
    const participant = await this.prisma.planParticipant.findFirst({
      where: { planId, userId },
      select: { id: true },
    });
    if (plan.ledgerId) {
      const access = await this.authorization.requireMember(
        plan.ledgerId,
        userId,
      );
      return {
        ...plan,
        ledger: access.ledger,
        role: access.role,
        isParticipant: Boolean(participant),
      };
    }
    if (!participant && plan.createdById !== userId) {
      throw new NotFoundException('Plan not found');
    }
    return {
      ...plan,
      ledger: null,
      role: null,
      isParticipant: Boolean(participant),
    };
  }

  private async requireMutablePlan(
    planId: string,
    userId: string,
  ): Promise<AccessiblePlan> {
    const plan = await this.requireAccessiblePlan(planId, userId);
    this.requireScopeOpen(plan);
    this.requirePlanOpen(plan);
    return plan;
  }

  private async findPlan(planId: string): Promise<PlanRow> {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      select: PLAN_SELECT,
    });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  private async planStateChange(
    plan: AccessiblePlan,
    actorId: string,
    data: {
      status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
      archivedAt?: Date | null;
    },
    action: string,
  ): Promise<PlanRow> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.plan.update({
        where: { id: plan.id },
        data,
        select: PLAN_SELECT,
      });
      await this.recordActivity(plan, actorId, action, tx);
      return updated;
    });
  }

  private recordActivity(
    plan: Pick<AccessiblePlan, 'id' | 'ledgerId'>,
    actorId: string,
    action: string,
    tx: Prisma.TransactionClient,
  ) {
    return this.activity.record(
      {
        ledgerId: plan.ledgerId,
        planId: plan.id,
        actorUserId: actorId,
        entityType: 'Plan',
        entityId: plan.id,
        action,
      },
      tx,
    );
  }

  private requireManagePermission(
    plan: AccessiblePlan,
    userId: string,
    allowCreatorMember: boolean,
  ): void {
    if (!plan.ledgerId) {
      if (plan.createdById === userId) return;
      throw new ForbiddenException('Only the Plan creator can manage it');
    }
    if (plan.role === 'OWNER' || plan.role === 'ADMIN') return;
    if (allowCreatorMember && plan.createdById === userId) return;
    throw new ForbiddenException('Insufficient plan permissions');
  }

  private requireParticipantPermission(
    plan: AccessiblePlan,
    userId: string,
  ): void {
    if (!plan.ledgerId) {
      if (plan.createdById === userId) return;
      throw new ForbiddenException(
        'Only the Plan creator can manage participants',
      );
    }
    if (plan.role === 'OWNER' || plan.role === 'ADMIN') return;
    if (
      plan.role === 'MEMBER' &&
      plan.createdById === userId &&
      plan.status === 'ACTIVE'
    ) {
      return;
    }
    throw new ForbiddenException('Insufficient plan permissions');
  }

  private requireScopeOpen(plan: AccessiblePlan): void {
    if (plan.ledger?.archivedAt) {
      throw new ConflictException('Ledger is archived');
    }
  }

  private requirePlanOpen(plan: AccessiblePlan): void {
    if (plan.archivedAt || plan.status === 'ARCHIVED') {
      throw new ConflictException('Plan is archived');
    }
  }

  private requireMutableForMove(plan: AccessiblePlan): void {
    this.requireScopeOpen(plan);
    if (plan.archivedAt || plan.status !== 'ACTIVE') {
      throw new ConflictException('Only an active Plan can be linked');
    }
  }

  private async countPlanFinance(planId: string): Promise<number> {
    const [expenses, settlements, incomes] = await Promise.all([
      this.prisma.expense.count({ where: { planId } }),
      this.prisma.settlement.count({ where: { planId } }),
      this.prisma.income.count({ where: { planId } }),
    ]);
    return expenses + settlements + incomes;
  }

  private validateDates(startsAt: Date | null, endsAt: Date | null): void {
    if (startsAt && endsAt && endsAt < startsAt) {
      throw new BadRequestException('endsAt must be on or after startsAt');
    }
  }

  private normalizeName(value: string): string {
    return value.trim();
  }

  private normalizeNullableText(
    value: string | null | undefined,
  ): string | null {
    return value === undefined || value === null ? null : value.trim();
  }

  private toResponse(plan: PlanRow): PlanResponseDto {
    const { _count, ...data } = plan;
    return {
      ...data,
      scope: plan.ledgerId ? 'LEDGER' : 'STANDALONE',
      participantCount: _count.participants,
    };
  }

  private hasPrismaCode(error: unknown, code: string): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === code
    );
  }
}
