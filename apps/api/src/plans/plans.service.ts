import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { SafeUser } from '../users/dto/user-response.dto.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  LedgerAuthorizationService,
  type LedgerAccessContext,
} from '../ledgers/ledger-authorization.service.js';
import type { AddParticipantDto } from './dto/add-participant.dto.js';
import type { CreatePlanDto } from './dto/create-plan.dto.js';
import type { ListPlansQueryDto } from './dto/list-plans-query.dto.js';
import type { MovePlanDto } from './dto/move-plan.dto.js';
import type {
  PlanParticipantResponseDto,
  PlanResponseDto,
} from './dto/plan-response.dto.js';
import type { UpdatePlanDto } from './dto/update-plan.dto.js';
import { ActivityLogService } from '../activity/activity-log.service.js';

const PLAN_SELECT = {
  archivedAt: true,
  createdAt: true,
  createdById: true,
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

type PlanRecord = {
  archivedAt: Date | null;
  createdAt: Date;
  createdById: string;
  description: string | null;
  endsAt: Date | null;
  id: string;
  ledger: LedgerAccessContext['ledger'];
  ledgerId: string;
  name: string;
  role: LedgerAccessContext['role'];
  startsAt: Date | null;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  updatedAt: Date;
  _count: { participants: number };
};

type PlanResponseRecord = Omit<PlanRecord, 'ledger' | 'role'>;

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
    await this.authorization.requireRole(ledgerId, user.id, [
      'OWNER',
      'ADMIN',
      'MEMBER',
    ]);
    this.validateDates(input.startsAt ?? null, input.endsAt ?? null);

    const plan = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.plan.create({
        data: {
          createdById: user.id,
          description: this.normalizeNullableText(input.description),
          endsAt: input.endsAt ?? null,
          ledgerId,
          name: this.normalizeName(input.name),
          startsAt: input.startsAt ?? null,
          status: 'ACTIVE',
        },
        select: { id: true },
      });
      await transaction.planParticipant.create({
        data: { planId: created.id, userId: user.id },
      });
      await this.activity.record(
        { ledgerId, actorUserId: user.id, entityType: 'Plan', entityId: created.id, action: 'plan.created' },
        transaction,
      );
      return transaction.plan.findUniqueOrThrow({
        where: { id: created.id },
        select: PLAN_SELECT,
      });
    });
    return this.toResponse(plan);
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
        ledger: {
          archivedAt: null,
          memberships: { some: { leftAt: null, userId } },
        },
      },
      select: PLAN_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    return plans.map((plan) => this.toResponse(plan));
  }

  async get(planId: string, userId: string): Promise<PlanResponseDto> {
    const plan = await this.requireAccessiblePlan(planId, userId);
    return this.toResponse(plan);
  }

  async update(
    planId: string,
    userId: string,
    input: UpdatePlanDto,
  ): Promise<PlanResponseDto> {
    const plan = await this.requireMutablePlan(planId, userId);
    this.requireManagePermission(plan, userId, { allowCreatorMember: true });
    if (
      input.name === undefined &&
      input.description === undefined &&
      input.startsAt === undefined &&
      input.endsAt === undefined
    ) {
      throw new BadRequestException('At least one plan field is required');
    }

    const startsAt =
      input.startsAt === undefined ? plan.startsAt : input.startsAt;
    const endsAt = input.endsAt === undefined ? plan.endsAt : input.endsAt;
    this.validateDates(startsAt, endsAt);
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.plan.update({
        where: { id: planId },
        data: {
          ...(input.name === undefined ? {} : { name: this.normalizeName(input.name) }),
          ...(input.description === undefined ? {} : { description: this.normalizeNullableText(input.description) }),
          ...(input.startsAt === undefined ? {} : { startsAt: input.startsAt }),
          ...(input.endsAt === undefined ? {} : { endsAt: input.endsAt }),
        },
        select: PLAN_SELECT,
      });
      await this.activity.record(
        { ledgerId: plan.ledgerId, actorUserId: userId, entityType: 'Plan', entityId: planId, action: 'plan.updated' },
        tx,
      );
      return result;
    });
    return this.toResponse(updated);
  }

  async complete(planId: string, userId: string): Promise<PlanResponseDto> {
    const plan = await this.requireMutablePlan(planId, userId);
    this.requireManagePermission(plan, userId, { allowCreatorMember: true });
    if (plan.status === 'COMPLETED') return this.toResponse(plan);
    const updated = await this.planStateChange(plan, userId, { status: 'COMPLETED' }, 'plan.completed');
    return this.toResponse(updated);
  }

  async reopen(planId: string, userId: string): Promise<PlanResponseDto> {
    const plan = await this.requireMutablePlan(planId, userId);
    this.requireManagePermission(plan, userId, { allowCreatorMember: false });
    if (plan.status === 'ACTIVE') return this.toResponse(plan);
    const updated = await this.planStateChange(plan, userId, { status: 'ACTIVE' }, 'plan.reopened');
    return this.toResponse(updated);
  }

  async archive(planId: string, userId: string): Promise<PlanResponseDto> {
    const plan = await this.requireAccessiblePlan(planId, userId);
    this.requireLedgerOpen(plan);
    this.requireManagePermission(plan, userId, { allowCreatorMember: false });
    if (plan.archivedAt) return this.toResponse(plan);
    const now = new Date();
    const updated = await this.planStateChange(plan, userId, { archivedAt: now, status: 'ARCHIVED' }, 'plan.archived');
    return this.toResponse(updated);
  }

  async unarchive(planId: string, userId: string): Promise<PlanResponseDto> {
    const plan = await this.requireAccessiblePlan(planId, userId);
    this.requireLedgerOpen(plan);
    this.requireManagePermission(plan, userId, { allowCreatorMember: false });
    if (!plan.archivedAt) return this.toResponse(plan);
    const updated = await this.planStateChange(plan, userId, { archivedAt: null, status: 'ACTIVE' }, 'plan.reopened');
    return this.toResponse(updated);
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
    const member = await this.prisma.ledgerMembership.findFirst({
      where: { ledgerId: plan.ledgerId, leftAt: null, userId: input.userId },
      select: { id: true },
    });
    if (!member) {
      throw new BadRequestException(
        'Participant must be an active ledger member',
      );
    }
    try {
      const participant = await this.prisma.planParticipant.create({
        data: { planId, userId: input.userId },
        select: PARTICIPANT_SELECT,
      });
      if (!participant.user)
        throw new ConflictException('Participant user missing');
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
    const accessible = await this.requireAccessiblePlan(planId, actorId);
    this.requireLedgerOpen(accessible);
    this.requirePlanOpen(accessible);
    if (accessible.role !== 'OWNER') {
      throw new ForbiddenException(
        'Only the source ledger OWNER can move a plan',
      );
    }
    if (input.targetLedgerId === accessible.ledgerId) {
      throw new BadRequestException(
        'Target ledger must differ from source ledger',
      );
    }

    try {
      const moved = await this.prisma.$transaction(
        async (transaction) => {
          await transaction.$queryRaw`
            SELECT "id" FROM "Ledger"
            WHERE "id" IN (${accessible.ledgerId}::uuid, ${input.targetLedgerId}::uuid)
            ORDER BY "id" FOR UPDATE
          `;
          const plan = await transaction.plan.findUnique({
            where: { id: planId },
            select: { archivedAt: true, ledgerId: true, status: true },
          });
          if (!plan || plan.ledgerId !== accessible.ledgerId) {
            throw new ConflictException(
              'Plan changed while it was being moved',
            );
          }
          const [sourceLedger, targetLedger, sourceAccess, targetAccess] =
            await Promise.all([
              transaction.ledger.findUnique({
                where: { id: plan.ledgerId },
                select: { archivedAt: true },
              }),
              transaction.ledger.findUnique({
                where: { id: input.targetLedgerId },
                select: { archivedAt: true },
              }),
              transaction.ledgerMembership.findFirst({
                where: {
                  ledgerId: plan.ledgerId,
                  leftAt: null,
                  role: 'OWNER',
                  userId: actorId,
                },
                select: { id: true },
              }),
              transaction.ledgerMembership.findFirst({
                where: {
                  ledgerId: input.targetLedgerId,
                  leftAt: null,
                  role: { in: ['OWNER', 'ADMIN'] },
                  userId: actorId,
                },
                select: { id: true },
              }),
            ]);
          if (
            !sourceLedger ||
            !targetLedger ||
            !sourceAccess ||
            !targetAccess
          ) {
            throw new ForbiddenException('Required ledger access is missing');
          }
          if (
            sourceLedger.archivedAt ||
            targetLedger.archivedAt ||
            plan.archivedAt ||
            plan.status === 'ARCHIVED'
          ) {
            throw new ConflictException(
              'Archived plans or ledgers cannot be moved',
            );
          }

          const participants = await transaction.planParticipant.findMany({
            where: { planId, userId: { not: null } },
            select: { userId: true },
          });
          const participantIds = participants
            .map((participant) => participant.userId)
            .filter((userId): userId is string => userId !== null);
          if (participantIds.length > 0) {
            await transaction.$queryRaw`
              SELECT "id" FROM "LedgerMembership"
              WHERE "ledgerId" = ${input.targetLedgerId}::uuid
                AND "userId" IN (${Prisma.join(
                  participantIds.map((userId) => Prisma.sql`${userId}::uuid`),
                )})
                AND "leftAt" IS NULL
              FOR SHARE
            `;
          }
          const targetMemberships = await transaction.ledgerMembership.findMany(
            {
              where: {
                ledgerId: input.targetLedgerId,
                leftAt: null,
                userId: { in: participantIds },
              },
              select: { userId: true },
            },
          );
          const activeTargetUsers = new Set(
            targetMemberships.map((item) => item.userId),
          );
          const missingUserIds = participantIds.filter(
            (id) => !activeTargetUsers.has(id),
          );
          if (missingUserIds.length > 0) {
            throw new ConflictException({
              message:
                'Some plan participants are not members of the target ledger',
              userIds: missingUserIds,
            });
          }
          const updated = await transaction.plan.update({
            where: { id: planId },
            data: { ledgerId: input.targetLedgerId },
            select: PLAN_SELECT,
          });
          await this.activity.record(
            {
              ledgerId: accessible.ledgerId,
              actorUserId: actorId,
              entityType: 'Plan',
              entityId: planId,
              action: 'plan.moved_out',
              metadata: { targetLedgerId: input.targetLedgerId },
            },
            transaction,
          );
          await this.activity.record(
            {
              ledgerId: input.targetLedgerId,
              actorUserId: actorId,
              entityType: 'Plan',
              entityId: planId,
              action: 'plan.moved_in',
              metadata: { sourceLedgerId: accessible.ledgerId },
            },
            transaction,
          );
          return updated;
        },
        { isolationLevel: 'Serializable' },
      );
      return this.toResponse(moved);
    } catch (error) {
      if (this.hasPrismaCode(error, 'P2034')) {
        throw new ConflictException('Plan move conflicted');
      }
      throw error;
    }
  }

  private async requireAccessiblePlan(
    planId: string,
    userId: string,
  ): Promise<PlanRecord> {
    const plan = await this.findPlan(planId);
    const access = await this.authorization.requireMember(
      plan.ledgerId,
      userId,
    );
    return { ...plan, ledger: access.ledger, role: access.role };
  }

  private async planStateChange(
    plan: PlanRecord,
    actorId: string,
    data: { status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'; archivedAt?: Date | null },
    action: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.plan.update({ where: { id: plan.id }, data, select: PLAN_SELECT });
      await this.activity.record(
        { ledgerId: plan.ledgerId, actorUserId: actorId, entityType: 'Plan', entityId: plan.id, action },
        tx,
      );
      return updated;
    });
  }

  private async requireMutablePlan(
    planId: string,
    userId: string,
  ): Promise<PlanRecord> {
    const plan = await this.requireAccessiblePlan(planId, userId);
    this.requireLedgerOpen(plan);
    this.requirePlanOpen(plan);
    return plan;
  }

  private async findPlan(planId: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      select: PLAN_SELECT,
    });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  private requireManagePermission(
    plan: PlanRecord,
    userId: string,
    options: { allowCreatorMember: boolean },
  ): void {
    if (plan.role === 'OWNER' || plan.role === 'ADMIN') return;
    if (options.allowCreatorMember && plan.createdById === userId) return;
    throw new ForbiddenException('Insufficient plan permissions');
  }

  private requireParticipantPermission(plan: PlanRecord, userId: string): void {
    if (plan.role === 'OWNER' || plan.role === 'ADMIN') return;
    if (
      plan.role === 'MEMBER' &&
      plan.createdById === userId &&
      plan.status === 'ACTIVE'
    )
      return;
    throw new ForbiddenException('Insufficient plan permissions');
  }

  private requireLedgerOpen(plan: PlanRecord): void {
    if (plan.ledger.archivedAt)
      throw new ConflictException('Ledger is archived');
  }

  private requirePlanOpen(plan: PlanRecord): void {
    if (plan.archivedAt || plan.status === 'ARCHIVED') {
      throw new ConflictException('Plan is archived');
    }
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

  private toResponse(plan: PlanResponseRecord): PlanResponseDto {
    return { ...plan, participantCount: plan._count.participants };
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
