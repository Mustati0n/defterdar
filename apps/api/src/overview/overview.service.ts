import { Injectable } from '@nestjs/common';
import { ActivityLogService } from '../activity/activity-log.service.js';
import { BalancesService } from '../balances/balances.service.js';
import { LedgersService } from '../ledgers/ledgers.service.js';
import { PlansService } from '../plans/plans.service.js';
import type { OverviewResponseDto } from './dto/overview-response.dto.js';

@Injectable()
export class OverviewService {
  constructor(
    private readonly ledgersService: LedgersService,
    private readonly plansService: PlansService,
    private readonly balancesService: BalancesService,
    private readonly activityService: ActivityLogService,
  ) {}

  async get(userId: string): Promise<OverviewResponseDto> {
    const [ledgers, plans] = await Promise.all([
      this.ledgersService.list(userId, false),
      this.plansService.listForUser(userId, false),
    ]);
    const activePlans = plans.filter((plan) => plan.status === 'ACTIVE');
    const sharedLedgers = ledgers.filter((ledger) => ledger.type === 'SHARED');
    const firstLedger = ledgers[0];

    const [ledgerBalances, planBalances, activityResult] = await Promise.all([
      Promise.all(
        sharedLedgers.map(async (ledger) => ({
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
        : null,
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

    return { ledgers, plans, ledgerBalances, planBalances, activity };
  }
}
