import { ConfigService } from '@nestjs/config';
import { ExpenseAttachmentsService } from './expense-attachments.service.js';

describe('ExpenseAttachmentsService list', () => {
  it('requires ledger membership and returns only active attachments', async () => {
    const expense = { id: 'expense-1', ledgerId: 'ledger-1' };
    const attachment = {
      id: 'attachment-1',
      expenseId: expense.id,
      originalFileName: 'fis.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 42,
      status: 'READY',
      createdById: 'user-1',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      completedAt: new Date('2026-01-01T00:01:00Z'),
      deletedAt: null,
    };
    const prisma = {
      expense: { findUnique: jest.fn().mockResolvedValue(expense) },
      expenseAttachment: {
        findMany: jest.fn().mockResolvedValue([attachment]),
      },
    };
    const authorization = {
      requireMember: jest.fn().mockResolvedValue({ role: 'MEMBER' }),
    };
    const service = new ExpenseAttachmentsService(
      prisma as never,
      authorization as never,
      {} as never,
      {} as never,
      {} as never,
      new ConfigService({ ATTACHMENT_MAX_BYTES: 10_000_000 }) as never,
    );

    await expect(service.list(expense.id, 'user-1')).resolves.toEqual([
      attachment,
    ]);
    expect(authorization.requireMember).toHaveBeenCalledWith(
      expense.ledgerId,
      'user-1',
    );
    expect(prisma.expenseAttachment.findMany).toHaveBeenCalledWith({
      where: { expenseId: expense.id, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  });
});
