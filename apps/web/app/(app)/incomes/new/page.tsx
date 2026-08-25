import type { Metadata } from 'next';
import { PageHeading } from '@/components/page-heading';
import { LazyRouteForm } from '@/features/forms/lazy-route-form';

export const metadata: Metadata = { title: 'Gelir ekle' };

export default function NewIncomePage() {
  return (
    <>
      <PageHeading
        eyebrow="Nakit akışı"
        title="Gelir ekle"
        description="Defterine giren parayı kaydet; aylık özeti gerçeğe yaklaştır."
        variant="static"
      />
      <LazyRouteForm kind="income" />
    </>
  );
}
