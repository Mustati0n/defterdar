import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { LedgerAuthorizationService } from '../ledgers/ledger-authorization.service.js';
import { FinancialProjectionService } from './financial-projection.service.js';
import { PlanAuthorizationService } from '../plans/plan-authorization.service.js';

@Injectable()
export class BalancesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: LedgerAuthorizationService,
    private readonly plans: PlanAuthorizationService,
    private readonly projection: FinancialProjectionService,
  ) {}
  async ledger(ledgerId: string, userId: string) {
    const access = await this.authorization.requireMember(ledgerId, userId);
    return this.project(ledgerId, access.ledger.currency);
  }
  async plan(planId: string, userId: string) {
    const access = await this.plans.requireAccess(planId, userId);
    return this.project(access.plan.ledgerId, access.plan.currency, planId);
  }
  private async project(
    ledgerId: string | null,
    currency: string,
    planId?: string,
  ) {
    const positions = await this.projection.positions(ledgerId, { planId });
    const users = await this.prisma.user.findMany({
      where: { id: { in: positions.map((p) => p.userId) } },
      select: { id: true, displayName: true },
    });
    const names = new Map(users.map((u) => [u.id, u]));
    return {
      currency,
      positions: positions.map((p) => ({
        user: names.get(p.userId)!,
        netMinor: this.number(p.netMinor),
      })),
      suggestions: this.projection
        .suggestions(positions)
        .map((s) => ({ ...s, amountMinor: this.number(s.amountMinor) })),
    };
  }
  private number(value: bigint) {
    const result = Number(value);
    if (!Number.isSafeInteger(result))
      throw new RangeError('Balance exceeds safe integer range');
    return result;
  }
}
