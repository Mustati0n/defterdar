import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ChangeMemberRoleDto } from './dto/change-member-role.dto.js';
import type { MemberResponseDto } from './dto/member-response.dto.js';
import type { OwnershipTransferResponseDto } from './dto/ledger-response.dto.js';
import type { TransferOwnershipDto } from './dto/transfer-ownership.dto.js';
import { LedgerAuthorizationService } from './ledger-authorization.service.js';
import { ActivityLogService } from '../activity/activity-log.service.js';

const MEMBER_SELECT = {
  joinedAt: true,
  role: true,
  user: { select: { displayName: true, id: true } },
} as const;

@Injectable()
export class LedgerMembershipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: LedgerAuthorizationService,
    private readonly activity: ActivityLogService,
  ) {}

  async list(ledgerId: string, actorId: string): Promise<MemberResponseDto[]> {
    await this.authorization.requireMember(ledgerId, actorId);
    return this.prisma.ledgerMembership.findMany({
      where: { ledgerId, leftAt: null },
      select: MEMBER_SELECT,
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    });
  }

  async changeRole(
    ledgerId: string,
    targetUserId: string,
    actorId: string,
    input: ChangeMemberRoleDto,
  ): Promise<MemberResponseDto> {
    const context = await this.authorization.requireRole(ledgerId, actorId, [
      'OWNER',
    ]);
    this.requireShared(context.ledger.type);
    const target = await this.findActiveMembership(ledgerId, targetUserId);
    if (target.role === 'OWNER') {
      throw new BadRequestException('OWNER role requires ownership transfer');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.ledgerMembership.update({
        where: { id: target.id },
        data: { role: input.role },
        select: MEMBER_SELECT,
      });
      await this.activity.record(
        {
          ledgerId,
          actorUserId: actorId,
          entityType: 'LedgerMembership',
          entityId: target.id,
          action: 'membership.role_changed',
          metadata: { targetUserId, role: input.role },
        },
        tx,
      );
      return updated;
    });
  }

  async remove(
    ledgerId: string,
    targetUserId: string,
    actorId: string,
  ): Promise<void> {
    const context = await this.authorization.requireRole(ledgerId, actorId, [
      'OWNER',
    ]);
    this.requireShared(context.ledger.type);
    const target = await this.findActiveMembership(ledgerId, targetUserId);
    if (target.role === 'OWNER') {
      throw new BadRequestException('OWNER cannot be removed');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.ledgerMembership.update({ where: { id: target.id }, data: { leftAt: new Date() } });
      await this.activity.record(
        {
          ledgerId,
          actorUserId: actorId,
          entityType: 'LedgerMembership',
          entityId: target.id,
          action: 'membership.removed',
          metadata: { targetUserId },
        },
        tx,
      );
    });
  }

  async leave(ledgerId: string, actorId: string): Promise<void> {
    const context = await this.authorization.requireMember(ledgerId, actorId);
    if (context.ledger.archivedAt) {
      throw new ConflictException('Ledger is archived');
    }
    this.requireShared(context.ledger.type);
    if (context.role === 'OWNER') {
      throw new BadRequestException('Transfer ownership before leaving');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.ledgerMembership.update({ where: { id: context.membershipId }, data: { leftAt: new Date() } });
      await this.activity.record(
        {
          ledgerId,
          actorUserId: actorId,
          entityType: 'LedgerMembership',
          entityId: context.membershipId,
          action: 'membership.left',
        },
        tx,
      );
    });
  }

  async transferOwnership(
    ledgerId: string,
    actorId: string,
    input: TransferOwnershipDto,
  ): Promise<OwnershipTransferResponseDto> {
    const context = await this.authorization.requireRole(ledgerId, actorId, [
      'OWNER',
    ]);
    this.requireShared(context.ledger.type);
    if (input.newOwnerUserId === actorId) {
      throw new BadRequestException('New owner must be another member');
    }

    try {
      return await this.prisma.$transaction(
        async (transaction) => {
          const target = await transaction.ledgerMembership.findFirst({
            where: {
              ledgerId,
              leftAt: null,
              userId: input.newOwnerUserId,
            },
            select: { id: true },
          });
          if (!target) {
            throw new BadRequestException('New owner must be an active member');
          }

          const claimed = await transaction.ledger.updateMany({
            where: {
              archivedAt: null,
              id: ledgerId,
              ownerId: actorId,
              type: 'SHARED',
            },
            data: { ownerId: input.newOwnerUserId },
          });
          if (claimed.count !== 1) {
            throw new ForbiddenException('Ownership has changed');
          }

          await transaction.ledgerMembership.update({
            where: { id: context.membershipId },
            data: { role: 'ADMIN' },
          });

          await this.activity.record(
            {
              ledgerId,
              actorUserId: actorId,
              entityType: 'Ledger',
              entityId: ledgerId,
              action: 'ledger.ownership_transferred',
              metadata: { previousOwnerUserId: actorId, newOwnerUserId: input.newOwnerUserId },
            },
            transaction,
          );
          await transaction.ledgerMembership.update({
            where: { id: target.id },
            data: { role: 'OWNER' },
          });

          return { ledgerId, ownerId: input.newOwnerUserId };
        },
        { isolationLevel: 'Serializable' },
      );
    } catch (error) {
      if (this.hasPrismaCode(error, 'P2034')) {
        throw new ConflictException('Ownership transfer conflicted');
      }
      throw error;
    }
  }

  private async findActiveMembership(ledgerId: string, userId: string) {
    const membership = await this.prisma.ledgerMembership.findFirst({
      where: { ledgerId, leftAt: null, userId },
      select: { id: true, role: true },
    });
    if (!membership) {
      throw new NotFoundException('Member not found');
    }
    return membership;
  }

  private requireShared(type: 'PERSONAL' | 'SHARED'): void {
    if (type !== 'SHARED') {
      throw new BadRequestException(
        'Operation is not allowed on PERSONAL ledger',
      );
    }
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
