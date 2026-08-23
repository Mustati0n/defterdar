import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageHeading } from '@/components/page-heading';
import { LoadingState } from '@/components/ui/states';
import { ExpenseForm } from '@/features/expenses/expense-form';

export const metadata: Metadata = { title: 'Harcama ekle' };

export default function NewExpensePage() {
  return (
    <>
      <PageHeading
        eyebrow="Yeni kayıt"
        title="Harcama ekle"
        description="Ne olduğunu yaz, kimlerin paylaştığını seç; hesabı Defterdar yapsın."
      />
      <Suspense fallback={<LoadingState label="Harcama formu hazırlanıyor…" />}>
        <ExpenseForm />
      </Suspense>
    </>
  );
}
