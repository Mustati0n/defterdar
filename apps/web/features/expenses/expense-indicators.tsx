'use client';

import { Ban, Gift, Paperclip, Tag } from 'lucide-react';
import { useExpenseAttachments } from '@/features/data/hooks';
import type { Expense } from '@/lib/types';

export function ExpenseIndicators({ expense }: { expense: Expense }) {
  const attachments = useExpenseAttachments(expense.id);
  return (
    <span className="expense-indicators">
      {expense.category ? (
        <span>
          <Tag /> {expense.category.name}
        </span>
      ) : null}
      {expense.isGift ? (
        <span>
          <Gift /> Ismarla
        </span>
      ) : null}
      {expense.voidedAt ? (
        <span>
          <Ban /> İptal
        </span>
      ) : null}
      {attachments.data?.length ? (
        <span>
          <Paperclip /> {attachments.data.length}
        </span>
      ) : null}
    </span>
  );
}
