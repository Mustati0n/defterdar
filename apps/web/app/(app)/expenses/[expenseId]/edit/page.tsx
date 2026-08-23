'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeading } from '@/components/page-heading';
import { ExpenseEditForm } from '@/features/expenses/expense-edit-form';

export default function ExpenseEditPage() {
  const { expenseId } = useParams<{ expenseId: string }>();
  return (
    <>
      <Link className="back-link" href={`/expenses/${expenseId}`}>
        <ArrowLeft /> Harcamaya dön
      </Link>
      <PageHeading
        eyebrow="Harcama düzenle"
        title="Rakamları yeniden kontrol edelim."
        description="Kaydetmeden önce harcamanın güncel sürümü ve tüm finansal kurallar yeniden doğrulanır."
      />
      <ExpenseEditForm expenseId={expenseId} />
    </>
  );
}
