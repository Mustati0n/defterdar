import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../generated/prisma/client.js';
import type { Environment } from '../config/environment.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { LedgerAuthorizationService } from '../ledgers/ledger-authorization.service.js';
import { ObjectStorageService } from '../storage/object-storage.service.js';
import type { CreateExpenseAttachmentDto } from './dto/create-expense-attachment.dto.js';
import { ActivityLogService } from '../activity/activity-log.service.js';

@Injectable()
export class ExpenseAttachmentsService {
  private readonly maxBytes: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: LedgerAuthorizationService,
    private readonly storage: ObjectStorageService,
    private readonly activity: ActivityLogService,
    config: ConfigService<Environment, true>,
  ) {
    this.maxBytes = config.get('ATTACHMENT_MAX_BYTES', { infer: true });
  }

  async create(
    expenseId: string,
    actorId: string,
    dto: CreateExpenseAttachmentDto,
  ) {
    if (dto.sizeBytes > this.maxBytes)
      throw new BadRequestException(
        `Attachment exceeds ${this.maxBytes} bytes`,
      );
    const initial = await this.findExpense(expenseId);
    const access = await this.authorization.requireMember(
      initial.ledgerId,
      actorId,
    );
    this.manage(initial, actorId, access.role);
    const storageKey = `ledgers/${initial.ledgerId}/expenses/${expenseId}/${randomUUID()}`;
    const attachmentId = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(
        Prisma.sql`SELECT "id" FROM "Expense" WHERE "id" = CAST(${expenseId} AS uuid) FOR UPDATE`,
      );
      const expense = await tx.expense.findUnique({
        where: { id: expenseId },
        include: { ledger: true },
      });
      if (!expense) throw new NotFoundException('Expense not found');
      if (expense.voidedAt) throw new ConflictException('Expense is voided');
      if (expense.ledger.archivedAt)
        throw new ConflictException('Ledger is archived');
      const activeCount = await tx.expenseAttachment.count({
        where: { expenseId, deletedAt: null },
      });
      if (activeCount >= 5)
        throw new ConflictException('Expense already has 5 active attachments');
      const created = await tx.expenseAttachment.create({
        data: {
          expenseId,
          storageKey,
          originalFileName: dto.fileName.trim(),
          mimeType: dto.mimeType,
          sizeBytes: dto.sizeBytes,
          createdById: actorId,
        },
        select: { id: true },
      });
      await this.activity.record(
        {
          ledgerId: initial.ledgerId,
          actorUserId: actorId,
          entityType: 'ExpenseAttachment',
          entityId: created.id,
          action: 'attachment.added',
          metadata: {
            expenseId,
            mimeType: dto.mimeType,
            sizeBytes: dto.sizeBytes,
          },
        },
        tx,
      );
      return created.id;
    });
    try {
      const signed = await this.storage.createUploadUrl(
        storageKey,
        dto.mimeType,
        dto.sizeBytes,
      );
      return {
        attachmentId,
        uploadUrl: signed.url,
        expiresAt: signed.expiresAt,
      };
    } catch (error: unknown) {
      await this.prisma.expenseAttachment.update({
        where: { id: attachmentId },
        data: { deletedAt: new Date() },
      });
      throw error;
    }
  }

  async list(expenseId: string, actorId: string) {
    const expense = await this.findExpense(expenseId);
    await this.authorization.requireMember(expense.ledgerId, actorId);
    const attachments = await this.prisma.expenseAttachment.findMany({
      where: { expenseId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    return attachments.map((attachment) => this.response(attachment));
  }

  async complete(id: string, actorId: string) {
    const attachment = await this.find(id);
    const access = await this.authorization.requireMember(
      attachment.expense.ledgerId,
      actorId,
    );
    this.manage(attachment.expense, actorId, access.role);
    if (attachment.deletedAt)
      throw new NotFoundException('Attachment not found');
    if (attachment.status === 'READY') return this.response(attachment);
    const object = await this.storage.head(attachment.storageKey);
    if (!object) throw new ConflictException('Uploaded object was not found');
    if (
      object.sizeBytes !== attachment.sizeBytes ||
      object.mimeType !== attachment.mimeType
    )
      throw new ConflictException(
        'Uploaded object metadata does not match request',
      );
    const completed = await this.prisma.expenseAttachment.update({
      where: { id },
      data: { status: 'READY', completedAt: new Date() },
      include: { expense: { select: { ledgerId: true, createdById: true } } },
    });
    return this.response(completed);
  }

  async url(id: string, actorId: string) {
    const attachment = await this.find(id);
    await this.authorization.requireMember(
      attachment.expense.ledgerId,
      actorId,
    );
    if (attachment.deletedAt || attachment.status !== 'READY')
      throw new NotFoundException('Attachment not found');
    return this.storage.createDownloadUrl(attachment.storageKey);
  }

  async remove(id: string, actorId: string) {
    const attachment = await this.find(id);
    const access = await this.authorization.requireMember(
      attachment.expense.ledgerId,
      actorId,
    );
    this.manage(attachment.expense, actorId, access.role);
    if (!attachment.deletedAt)
      await this.prisma.$transaction(async (tx) => {
        await tx.expenseAttachment.update({
          where: { id },
          data: { deletedAt: new Date() },
        });
        await this.activity.record(
          {
            ledgerId: attachment.expense.ledgerId,
            actorUserId: actorId,
            entityType: 'ExpenseAttachment',
            entityId: id,
            action: 'attachment.removed',
          },
          tx,
        );
      });
    try {
      await this.storage.delete(attachment.storageKey);
    } catch {
      // Metadata is authoritative; object deletion is intentionally best-effort.
    }
  }

  private findExpense(id: string) {
    return this.prisma.expense
      .findUnique({ where: { id }, include: { ledger: true } })
      .then((expense) => {
        if (!expense) throw new NotFoundException('Expense not found');
        return expense;
      });
  }

  private async find(id: string) {
    const attachment = await this.prisma.expenseAttachment.findUnique({
      where: { id },
      include: { expense: { select: { ledgerId: true, createdById: true } } },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');
    return attachment;
  }

  private manage(
    expense: { createdById: string },
    actorId: string,
    role: string,
  ) {
    if (role === 'OWNER' || role === 'ADMIN' || expense.createdById === actorId)
      return;
    throw new ForbiddenException('Insufficient attachment permissions');
  }

  private response(attachment: {
    id: string;
    expenseId: string;
    originalFileName: string;
    mimeType: string;
    sizeBytes: number;
    status: string;
    createdById: string;
    createdAt: Date;
    completedAt: Date | null;
    deletedAt: Date | null;
  }) {
    return {
      id: attachment.id,
      expenseId: attachment.expenseId,
      originalFileName: attachment.originalFileName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      status: attachment.status,
      createdById: attachment.createdById,
      createdAt: attachment.createdAt,
      completedAt: attachment.completedAt,
      deletedAt: attachment.deletedAt,
    };
  }
}
