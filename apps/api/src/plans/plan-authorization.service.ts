import { Injectable, NotFoundException } from '@nestjs/common';
import {
  LedgerAuthorizationService,
  type LedgerAccessContext,
  type LedgerRoleName,
} from '../ledgers/ledger-authorization.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const ACCESS_PLAN_SELECT = {
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
} as const;

export interface PlanAccessContext {
  plan: {
    archivedAt: Date | null;
    createdAt: Date;
    createdById: string;
    currency: string;
    description: string | null;
    endsAt: Date | null;
    id: string;
    ledgerId: string | null;
    name: string;
    startsAt: Date | null;
    status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
    updatedAt: Date;
  };
  ledger: LedgerAccessContext['ledger'] | null;
  ledgerRole: LedgerRoleName | null;
  isCreator: boolean;
  isParticipant: boolean;
}

@Injectable()
export class PlanAuthorizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgers: LedgerAuthorizationService,
  ) {}

  async requireAccess(
    planId: string,
    userId: string,
  ): Promise<PlanAccessContext> {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      select: ACCESS_PLAN_SELECT,
    });
    if (!plan) throw new NotFoundException('Plan not found');

    const participant = await this.prisma.planParticipant.findFirst({
      where: { planId, userId },
      select: { id: true },
    });

    if (plan.ledgerId) {
      const ledger = await this.ledgers.requireMember(plan.ledgerId, userId);
      return {
        plan,
        ledger: ledger.ledger,
        ledgerRole: ledger.role,
        isCreator: plan.createdById === userId,
        isParticipant: Boolean(participant),
      };
    }

    if (!participant && plan.createdById !== userId) {
      throw new NotFoundException('Plan not found');
    }

    return {
      plan,
      ledger: null,
      ledgerRole: null,
      isCreator: plan.createdById === userId,
      isParticipant: Boolean(participant),
    };
  }
}
