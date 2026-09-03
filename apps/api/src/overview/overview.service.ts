import { Injectable } from '@nestjs/common';
import { ActivityLogService } from '../activity/activity-log.service.js';
import { BalancesService } from '../balances/balances.service.js';
import { LedgersService } from '../ledgers/ledgers.service.js';
import { PlansService } from '../plans/plans.service.js';
import type { OverviewResponseDto } from './dto/overview-response.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class OverviewService {
  constructor(
    private readonly ledgersService: LedgersService,
    private readonly plansService: PlansService,
    private readonly balancesService: BalancesService,
    private readonly activityService: ActivityLogService,
    private readonly prisma: PrismaService,
  ) {}

  async get(userId: string): Promise<OverviewResponseDto> {
    const [ledgers, plans] = await Promise.all([
      this.ledgersService.list(userId, false),
      this.plansService.listForUser(userId, false),
    ]);
    const activePlans = plans.filter((plan) => plan.status === 'ACTIVE');
    const collaborativeLedgers = ledgers.filter(
      (ledger) => (ledger.activeMemberCount ?? 1) > 1,
    );
    const firstLedger = ledgers[0];

    const [ledgerBalances, planBalances, activityResult, pendingRows] =
      await Promise.all([
        Promise.all(
          collaborativeLedgers.map(async (ledger) => ({
            ledgerId: ledger.id,
            balance: await this.balancesService.ledger(ledger.id, userId),
          })),
        ),
        Promise.all(
          activePlans.map(async (plan) => ({
            planId: plan.id,
            balance: await this.balancesService.plan(plan.id, userId),
          })),
        ),
        firstLedger
          ? this.activityService.list(firstLedger.id, userId, { limit: 5 })
          : activePlans[0]
            ? this.activityService.listPlan(activePlans[0].id, userId, {
                limit: 5,
              })
            : null,
        this.prisma.settlement.findMany({
          where: {
            status: 'PENDING',
            voidedAt: null,
            OR: [{ fromUserId: userId }, { toUserId: userId }],
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 8,
          include: {
            fromUser: { select: { id: true, displayName: true } },
            toUser: { select: { id: true, displayName: true } },
            confirmedBy: { select: { id: true, displayName: true } },
            rejectedBy: { select: { id: true, displayName: true } },
          },
        }),
      ]);

    const activity = activityResult
      ? {
          ...activityResult,
          items: activityResult.items.map((item) => ({
            ...item,
            metadata:
              item.metadata &&
              typeof item.metadata === 'object' &&
              !Array.isArray(item.metadata)
                ? item.metadata
                : {},
          })),
        }
      : null;

    const pendingPayments = pendingRows.map((payment) => ({
      ...payment,
      amountMinor: payment.amountMinor.toString(),
    }));

    return {
      ledgers,
      plans,
      ledgerBalances,
      planBalances,
      activity,
      pendingPayments,
    };
  }
}
