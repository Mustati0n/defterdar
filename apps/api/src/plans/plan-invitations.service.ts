import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ActivityLogService } from '../activity/activity-log.service.js';
import { TokenService } from '../auth/token.service.js';
import type { Environment } from '../config/environment.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { SafeUser } from '../users/dto/user-response.dto.js';
import type {
  AcceptedPlanInvitationResponseDto,
  CreatedPlanInvitationResponseDto,
  CreatePlanInvitationDto,
  PlanInvitationResponseDto,
} from './dto/plan-invitation.dto.js';
import { PlanAuthorizationService } from './plan-authorization.service.js';

const INVITATION_SELECT = {
  acceptedAt: true,
  createdAt: true,
  expiresAt: true,
  id: true,
  invitedEmail: true,
  revokedAt: true,
} as const;

@Injectable()
export class PlanInvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: PlanAuthorizationService,
    private readonly tokenService: TokenService,
    private readonly config: ConfigService<Environment, true>,
    private readonly activity: ActivityLogService,
  ) {}

  async create(
    planId: string,
    actorId: string,
    input: CreatePlanInvitationDto,
  ): Promise<CreatedPlanInvitationResponseDto> {
    const context = await this.requireStandaloneCreator(planId, actorId);
    if (context.plan.archivedAt || context.plan.status !== 'ACTIVE') {
      throw new ConflictException('Plan cannot accept invitations');
    }
    const token = this.tokenService.createOpaqueToken();
    const expiresAt = new Date(
      Date.now() +
        this.config.get('INVITATION_TTL_DAYS', { infer: true }) * 86_400_000,
    );
    await this.prisma.planInvitation.create({
      data: {
        createdById: actorId,
        expiresAt,
        invitedEmail: input.email,
        planId,
        tokenHash: token.tokenHash,
      },
    });
    return { expiresAt, token: token.rawToken };
  }

  async list(
    planId: string,
    actorId: string,
  ): Promise<PlanInvitationResponseDto[]> {
    await this.requireStandaloneCreator(planId, actorId);
    return this.prisma.planInvitation.findMany({
      where: { planId },
      select: INVITATION_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(
    planId: string,
    invitationId: string,
    actorId: string,
  ): Promise<void> {
    await this.requireStandaloneCreator(planId, actorId);
    const invitation = await this.prisma.planInvitation.findFirst({
      where: { id: invitationId, planId },
      select: { acceptedAt: true, id: true },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.acceptedAt) {
      throw new ConflictException('Accepted invitation cannot be revoked');
    }
    await this.prisma.planInvitation.updateMany({
      where: { id: invitation.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async accept(
    rawToken: string,
    user: SafeUser,
  ): Promise<AcceptedPlanInvitationResponseDto> {
    const now = new Date();
    const invitation = await this.prisma.planInvitation.findUnique({
      where: { tokenHash: this.tokenService.hashOpaqueToken(rawToken) },
      select: {
        acceptedAt: true,
        expiresAt: true,
        id: true,
        invitedEmail: true,
        planId: true,
        revokedAt: true,
      },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (
      invitation.acceptedAt ||
      invitation.revokedAt ||
      invitation.expiresAt <= now
    ) {
      throw new GoneException('Invitation is no longer valid');
    }
    if (invitation.invitedEmail !== user.email) {
      throw new ForbiddenException('Invitation belongs to another email');
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`
            SELECT "id" FROM "Plan" WHERE "id" = ${invitation.planId}::uuid FOR UPDATE
          `;
          const plan = await tx.plan.findFirst({
            where: {
              archivedAt: null,
              id: invitation.planId,
              ledgerId: null,
              status: 'ACTIVE',
            },
            select: { id: true },
          });
          if (!plan) {
            throw new ConflictException('Plan cannot accept invitations');
          }
          const claimed = await tx.planInvitation.updateMany({
            where: {
              acceptedAt: null,
              expiresAt: { gt: now },
              id: invitation.id,
              revokedAt: null,
            },
            data: { acceptedAt: now },
          });
          if (claimed.count !== 1) {
            throw new GoneException('Invitation is no longer valid');
          }
          const existing = await tx.planParticipant.findFirst({
            where: { planId: plan.id, userId: user.id },
            select: { id: true },
          });
          if (existing) {
            throw new ConflictException('User is already a Plan participant');
          }
          await tx.planParticipant.create({
            data: { planId: plan.id, userId: user.id },
          });
          await this.activity.record(
            {
              ledgerId: null,
              planId: plan.id,
              actorUserId: user.id,
              entityType: 'Plan',
              entityId: plan.id,
              action: 'plan.participant_joined',
            },
            tx,
          );
          return { planId: plan.id };
        },
        { isolationLevel: 'Serializable' },
      );
    } catch (error) {
      if (this.hasPrismaCode(error, 'P2002')) {
        throw new ConflictException('Invitation acceptance conflicted');
      }
      throw error;
    }
  }

  private async requireStandaloneCreator(planId: string, actorId: string) {
    const context = await this.authorization.requireAccess(planId, actorId);
    if (context.plan.ledgerId) {
      throw new BadRequestException(
        'Ledger-bound Plans use Ledger invitations',
      );
    }
    if (!context.isCreator) {
      throw new ForbiddenException(
        'Only the Plan creator can manage invitations',
      );
    }
    return context;
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
