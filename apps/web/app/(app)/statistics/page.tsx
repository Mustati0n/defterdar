'use client';

import { BarChart3, BookOpenText, NotebookTabs, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { PageHeading } from '@/components/page-heading';
import { ErrorState, LoadingState } from '@/components/ui/states';
import {
  AnalyticsDateControls,
  AnalyticsExperience,
} from '@/features/analytics/analytics-experience';
import type { AnalyticsPreset } from '@/features/analytics/analytics-date';
import { useAnalyticsSelection } from '@/features/analytics/use-analytics-selection';
import { useAuth } from '@/features/auth/auth-provider';
import { useAllPlans, useLedgers } from '@/features/data/hooks';
import { PageIntro } from '@/features/page-intro/page-intro';

export default function StatisticsPage() {
  const { user } = useAuth();
  const ledgers = useLedgers();
  const plans = useAllPlans(false);
  const { selection, select } = useAnalyticsSelection(user?.id);
  const [preset, setPreset] = useState<AnalyticsPreset>('month');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const targets = [
    ...(ledgers.data ?? []).map((ledger) => ({
      key: `ledger:${ledger.id}`,
      kind: 'ledger' as const,
      id: ledger.id,
      name: ledger.name,
      personal: !ledger.isCollaborative,
      plan: undefined,
    })),
    ...(plans.data ?? []).map((plan) => ({
      key: `plan:${plan.id}`,
      kind: 'plan' as const,
      id: plan.id,
      name: plan.name,
      personal: false,
      plan,
    })),
  ];
  const selectedKey = targets.some((target) => target.key === selection)
    ? selection
    : (targets[0]?.key ?? '');
  const target = targets.find((item) => item.key === selectedKey);

  if (ledgers.isLoading || plans.isLoading)
    return <LoadingState label="Analiz alanları hazırlanıyor…" />;
  if (ledgers.isError || plans.isError)
    return (
      <ErrorState
        onRetry={() => {
          void ledgers.refetch();
          void plans.refetch();
        }}
      />
    );
  if (!target) {
    return (
      <>
        <PageHeading
          eyebrow="Finansal görünüm"
          title="İstatistikler"
          description="Hareketlerin oluştuğunda dönem dengesini, kategorileri ve kişi dağılımlarını burada inceleyebilirsin."
          variant="compact"
        />
        <section
          className="analytics-start-empty"
          aria-labelledby="analytics-start-title"
        >
          <span className="analytics-start-empty__icon">
            <BarChart3 />
          </span>
          <div className="analytics-start-empty__copy">
            <span className="eyebrow">Başlangıç</span>
            <h2 id="analytics-start-title">
              Önce analiz edilecek bir alan oluştur.
            </h2>
            <p>
              İstatistikler yalnızca gerçek Defter ve Plan hareketlerinden
              hesaplanır. Bir çalışma alanı açıp ilk hareketini eklediğinde bu
              ekran otomatik olarak dolacak.
            </p>
          </div>
          <ol
            className="analytics-start-empty__steps"
            aria-label="İstatistikleri kullanmaya başlama adımları"
          >
            <li>
              <BookOpenText />
              <span>
                <strong>1. Çalışma alanını seç</strong>
                <small>Sürekli hesaplar için Defter oluştur.</small>
              </span>
            </li>
            <li>
              <NotebookTabs />
              <span>
                <strong>2. Hareketlerini kaydet</strong>
                <small>
                  Geçici bir amaç için bağımsız Plan da açabilirsin.
                </small>
              </span>
            </li>
          </ol>
          <div className="analytics-start-empty__actions">
            <Link
              className="button button--primary"
              href="/workspace?type=ledger&create=ledger"
            >
              <Plus /> Defter oluştur
            </Link>
            <Link
              className="button button--quiet"
              href="/workspace?type=plan&create=plan&standalone=1"
            >
              Yeni Plan oluştur
            </Link>
          </div>
        </section>
      </>
    );
  }

  const ledgerTargets = targets.filter((item) => item.kind === 'ledger');
  const planTargets = targets.filter((item) => item.kind === 'plan');
  const controls = { preset, custom, setPreset, setCustom };

  return (
    <>
      <PageIntro
        pageKey="analytics"
        title="Kayıtlarını dönemlere göre karşılaştır."
        steps={[
          'Önce gerçek bir Defter veya Plan seç, sonra hazır dönemlerden biriyle rakamları incele.',
          'Her hedef kendi para biriminde hesaplanır; farklı para birimleri yapay biçimde birleştirilmez.',
        ]}
      />
      <PageHeading
        eyebrow="Rakamların kenar notu"
        title="İstatistikler"
        description="Harcama, gelir ve hesap dağılımını seçtiğin gerçek çalışma alanında incele."
        variant="compact"
        tools={
          <div className="analytics-header-tools">
            <label className="field analytics-target-field">
              <span>Analiz alanı</span>
              <select
                className="input"
                value={selectedKey}
                onChange={(event) => select(event.target.value)}
              >
                {ledgerTargets.length ? (
                  <optgroup label="Defterler">
                    {ledgerTargets.map((item) => (
                      <option value={item.key} key={item.key}>
                        {item.name}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                {planTargets.length ? (
                  <optgroup label="Planlar">
                    {planTargets.map((item) => (
                      <option value={item.key} key={item.key}>
                        {item.name} ·{' '}
                        {item.plan?.scope === 'STANDALONE'
                          ? 'Deftere ekli değil'
                          : 'Deftere bağlı'}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
            </label>
            <AnalyticsDateControls {...controls} />
          </div>
        }
      />
      <AnalyticsExperience
        key={target.key}
        scope={target.kind}
        resourceId={target.id}
        personal={target.personal}
        planStatus={target.plan?.status}
        participantCount={target.plan?.participantCount}
        controls={controls}
        hideFilters
      />
    </>
  );
}
