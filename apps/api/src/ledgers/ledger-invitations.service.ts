import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenService } from '../auth/token.service.js';
import type { SafeUser } from '../users/dto/user-response.dto.js';
import type { Environment } from '../config/environment.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateInvitationDto } from './dto/create-invitation.dto.js';
import type {
  AcceptedInvitationResponseDto,
  CreatedInvitationResponseDto,
  InvitationResponseDto,
} from './dto/invitation-response.dto.js';
import { LedgerAuthorizationService } from './ledger-authorization.service.js';

const INVITATION_SELECT = {
  acceptedAt: true,
  createdAt: true,
  expiresAt: true,
  id: true,
  invitedEmail: true,
  revokedAt: true,
} as const;

@Injectable()
export class LedgerInvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: LedgerAuthorizationService,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService<Environment, true>,
  ) {}

  async create(
    ledgerId: string,
    actorId: string,
    input: CreateInvitationDto,
  ): Promise<CreatedInvitationResponseDto> {
    await this.authorization.requireRole(ledgerId, actorId, [
      'OWNER',
      'ADMIN',
    ]);

    const token = this.tokenService.createOpaqueToken();
    const ttlDays = this.configService.get('INVITATION_TTL_DAYS', {
      infer: true,
    });
    const expiresAt = new Date(Date.now() + ttlDays * 86_400_000);

    await this.prisma.ledgerInvitation.create({
      data: {
        createdById: actorId,
        expiresAt,
        invitedEmail: input.email ?? null,
        ledgerId,
        role: 'MEMBER',
        tokenHash: token.tokenHash,
      },
    });

    return { expiresAt, token: token.rawToken };
  }

  async list(
    ledgerId: string,
    actorId: string,
  ): Promise<InvitationResponseDto[]> {
    await this.authorization.requireRole(
      ledgerId,
      actorId,
      ['OWNER', 'ADMIN'],
      { allowArchived: true },
    );
    return this.prisma.ledgerInvitation.findMany({
      where: { ledgerId },
      select: INVITATION_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(
    ledgerId: string,
    invitationId: string,
    actorId: string,
  ): Promise<void> {
    await this.authorization.requireRole(ledgerId, actorId, [
      'OWNER',
      'ADMIN',
    ]);
    const invitation = await this.prisma.ledgerInvitation.findFirst({
      where: { id: invitationId, ledgerId },
      select: { acceptedAt: true, id: true },
    });
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    if (invitation.acceptedAt) {
      throw new ConflictException('Accepted invitation cannot be revoked');
    }

    await this.prisma.ledgerInvitation.updateMany({
      where: { id: invitation.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async accept(
    rawToken: string,
    user: SafeUser,
  ): Promise<AcceptedInvitationResponseDto> {
    const now = new Date();
    const invitation = await this.prisma.ledgerInvitation.findUnique({
      where: { tokenHash: this.tokenService.hashOpaqueToken(rawToken) },
      select: {
        acceptedAt: true,
        expiresAt: true,
        id: true,
        invitedEmail: true,
        ledgerId: true,
        revokedAt: true,
      },
    });
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    if (
      invitation.revokedAt ||
      invitation.acceptedAt ||
      invitation.expiresAt <= now
    ) {
      throw new GoneException('Invitation is no longer valid');
    }
    if (invitation.invitedEmail && invitation.invitedEmail !== user.email) {
      throw new ForbiddenException('Invitation belongs to another email');
    }

    try {
      return await this.prisma.$transaction(
        async (transaction) => {
          await transaction.$queryRaw`
            SELECT "id" FROM "Ledger"
            WHERE "id" = ${invitation.ledgerId}::uuid
            FOR UPDATE
          `;

          const ledger = await transaction.ledger.findFirst({
            where: {
              archivedAt: null,
              id: invitation.ledgerId,
            },
            select: { id: true },
          });
          if (!ledger) {
            throw new ConflictException('Ledger cannot accept invitations');
          }

          const claimed = await transaction.ledgerInvitation.updateMany({
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

          const activeMembership = await transaction.ledgerMembership.findFirst(
            {
              where: {
                ledgerId: invitation.ledgerId,
                leftAt: null,
                userId: user.id,
              },
              select: { id: true },
            },
          );
          if (activeMembership) {
            throw new ConflictException('User is already a ledger member');
          }

          const inactiveMembership =
            await transaction.ledgerMembership.findFirst({
              where: {
                ledgerId: invitation.ledgerId,
                leftAt: { not: null },
                userId: user.id,
              },
              orderBy: { joinedAt: 'desc' },
              select: { id: true },
            });

          if (inactiveMembership) {
            await transaction.ledgerMembership.update({
              where: { id: inactiveMembership.id },
              data: { joinedAt: now, leftAt: null, role: 'MEMBER' },
            });
          } else {
            await transaction.ledgerMembership.create({
              data: {
                joinedAt: now,
                ledgerId: invitation.ledgerId,
                role: 'MEMBER',
                userId: user.id,
              },
            });
          }

          return { ledgerId: invitation.ledgerId, role: 'MEMBER' };
        },
        { isolationLevel: 'Serializable' },
      );
    } catch (error) {
      if (
        this.hasPrismaCode(error, 'P2002') ||
        this.hasPrismaCode(error, 'P2034')
      ) {
        throw new ConflictException('Invitation acceptance conflicted');
      }
      throw error;
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
