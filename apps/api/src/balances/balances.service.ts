import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { LedgerAuthorizationService } from '../ledgers/ledger-authorization.service.js';
import { FinancialProjectionService } from './financial-projection.service.js';

@Injectable()
export class BalancesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: LedgerAuthorizationService,
    private readonly projection: FinancialProjectionService,
  ) {}
  async ledger(ledgerId: string, userId: string) {
    const access = await this.authorization.requireMember(ledgerId, userId);
    return this.project(ledgerId, access.ledger.currency);
  }
  async plan(planId: string, userId: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      select: { ledgerId: true, ledger: { select: { currency: true } } },
    });
    if (!plan) throw new NotFoundException('Plan not found');
    if (!plan.ledgerId || !plan.ledger) {
      throw new BadRequestException(
        'Standalone Plan balances are not available yet',
      );
    }
    await this.authorization.requireMember(plan.ledgerId, userId);
    return this.project(plan.ledgerId, plan.ledger.currency, planId);
  }
  private async project(ledgerId: string, currency: string, planId?: string) {
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
