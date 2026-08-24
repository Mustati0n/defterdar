import type { Metadata } from 'next';
import { PageHeading } from '@/components/page-heading';
import { LazyRouteForm } from '@/features/forms/lazy-route-form';

export const metadata: Metadata = { title: 'Harcama ekle' };

export default function NewExpensePage() {
  return (
    <>
      <PageHeading
        eyebrow="Yeni kayıt"
        title="Harcama ekle"
        description="Ne olduğunu yaz, kimlerin paylaştığını seç; hesabı Defterdar yapsın."
      />
      <LazyRouteForm kind="expense" />
    </>
  );
}
