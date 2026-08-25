'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { PageHeading } from '@/components/page-heading';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { AnalyticsExperience } from '@/features/analytics/analytics-experience';
import { useLedgers } from '@/features/data/hooks';
import { PageIntro } from '@/features/page-intro/page-intro';

export default function StatisticsPage() {
  const ledgers = useLedgers();
  const [selectedId, setSelectedId] = useState('');
  const ledgerId = selectedId || ledgers.data?.[0]?.id || '';
  const ledger = ledgers.data?.find((item) => item.id === ledgerId);

  if (ledgers.isLoading) return <LoadingState />;
  if (ledgers.isError)
    return <ErrorState onRetry={() => void ledgers.refetch()} />;
  if (!ledgers.data?.length) {
    return (
      <>
        <PageIntro
          pageKey="analytics"
          title="Kayıtlarını dönemlere göre karşılaştır."
          steps={[
            'Bir Defter veya Plan kapsamı seç, sonra hazır dönemlerden biriyle rakamları incele.',
          ]}
        />
        <EmptyState
          title="Ölçülecek Defter yok"
          description="İstatistikler ilk Defter ve hareketlerle birlikte burada oluşacak."
          action={
            <Link className="button button--primary" href="/ledgers?create=1">
              <Plus /> Defter oluştur
            </Link>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageIntro
        pageKey="analytics"
        title="Kayıtlarını dönemlere göre karşılaştır."
        steps={[
          'Önce Defter kapsamını seç, sonra bu ay, son üç ay veya özel tarih aralığına geç.',
          'Harcama, gelir ve ortak hesap dağılımı aynı gerçek kayıtlardan hesaplanır.',
        ]}
      />
      <PageHeading
        eyebrow="Rakamların kenar notu"
        title="İstatistikler"
        description="Harcamanı, gelirini ve ortak hesabın dağılımını gerçek Defter kayıtlarıyla karşılaştır."
        action={
          <label className="field ledger-picker-field">
            <span>Defter</span>
            <select
              className="input ledger-picker"
              value={ledgerId}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              {ledgers.data.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        }
      />
      <AnalyticsExperience
        scope="ledger"
        resourceId={ledgerId}
        personal={ledger?.type === 'PERSONAL'}
      />
    </>
  );
}
