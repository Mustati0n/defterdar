import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageHeading } from '@/components/page-heading';
import { LoadingState } from '@/components/ui/states';
import { IncomeForm } from '@/features/incomes/income-form';

export const metadata: Metadata = { title: 'Gelir ekle' };

export default function NewIncomePage() {
  return (
    <>
      <PageHeading
        eyebrow="Nakit akışı"
        title="Gelir ekle"
        description="Defterine giren parayı kaydet; aylık özeti gerçeğe yaklaştır."
      />
      <Suspense fallback={<LoadingState label="Gelir formu hazırlanıyor…" />}>
        <IncomeForm />
      </Suspense>
    </>
  );
}
