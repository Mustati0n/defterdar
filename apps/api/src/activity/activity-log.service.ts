import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { LedgerAuthorizationService } from '../ledgers/ledger-authorization.service.js';
import type { ActivityQueryDto } from './dto/activity-query.dto.js';

type ActivityClient = Pick<Prisma.TransactionClient, 'activityLog'>;

export interface RecordActivityInput {
  ledgerId: string;
  actorUserId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  metadata?: Prisma.InputJsonObject;
}

@Injectable()
export class ActivityLogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: LedgerAuthorizationService,
  ) {}

  record(input: RecordActivityInput, client: ActivityClient = this.prisma) {
    return client.activityLog.create({
      data: { ...input, metadata: input.metadata ?? {} },
      select: { id: true },
    });
  }

  async list(ledgerId: string, actorId: string, query: ActivityQueryDto) {
    await this.authorization.requireMember(ledgerId, actorId);
    const rows = await this.prisma.activityLog.findMany({
      where: { ledgerId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: { actor: { select: { id: true, displayName: true } } },
    });
    const hasMore = rows.length > query.limit;
    const items = hasMore ? rows.slice(0, query.limit) : rows;
    return { items, nextCursor: hasMore ? items.at(-1)!.id : null };
  }
}
