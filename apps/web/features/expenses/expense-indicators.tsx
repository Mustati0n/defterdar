import { Ban, Gift, Paperclip, Tag } from 'lucide-react';
import type { Expense } from '@/lib/types';

export function ExpenseIndicators({ expense }: { expense: Expense }) {
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
      {expense.attachmentCount ? (
        <span>
          <Paperclip /> {expense.attachmentCount}
        </span>
      ) : null}
    </span>
  );
}
