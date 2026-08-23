'use client';

import {
  BarChart3,
  CircleDollarSign,
  LineChart,
  PieChart,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { PageHeading } from '@/components/page-heading';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { queryKeys, useLedgers } from '@/features/data/hooks';
import { api } from '@/lib/api-client';
import { formatMoneyFromMinor } from '@/lib/format';

export default function StatisticsPage() {
  const ledgers = useLedgers();
  const [selectedId, setSelectedId] = useState('');
  const ledgerId = selectedId || ledgers.data?.[0]?.id || '';
  const analytics = useQuery({
    queryKey: queryKeys.ledgerAnalytics(ledgerId),
    queryFn: () => api.ledgers.analytics(ledgerId),
    enabled: Boolean(ledgerId),
  });
  if (ledgers.isLoading) return <LoadingState />;
  if (ledgers.isError)
    return <ErrorState onRetry={() => void ledgers.refetch()} />;
  if (!ledgers.data?.length)
    return (
      <EmptyState
        title="Ölçülecek defter yok"
        description="İstatistikler ilk defter ve hareketlerle birlikte burada oluşacak."
      />
    );
  const data = analytics.data;
  return (
    <>
      <PageHeading
        eyebrow="Rakamların kenar notu"
        title="İstatistikler"
        description="Defter hareketlerinin sade, karşılaştırılabilir özeti."
        action={
          <select
            className="input ledger-picker"
            value={ledgerId}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            {ledgers.data.map((ledger) => (
              <option key={ledger.id} value={ledger.id}>
                {ledger.name}
              </option>
            ))}
          </select>
        }
      />
      {analytics.isLoading ? (
        <LoadingState label="Rakamlar hesaplanıyor…" />
      ) : null}
      {analytics.isError ? (
        <ErrorState onRetry={() => void analytics.refetch()} />
      ) : null}
      {data && data.expenseCount + data.incomeCount === 0 ? (
        <div className="smart-empty smart-empty--analytics">
          <span>
            <PieChart />
          </span>
          <div>
            <h3>Henüz analiz için yeterli hareket yok.</h3>
            <p>
              Birkaç harcamadan sonra burada harcama alışkanlıklarını
              görebileceksin.
            </p>
          </div>
          <Link
            className="button button--primary"
            href={`/expenses/new?ledgerId=${ledgerId}`}
          >
            <Plus /> İlk harcamayı ekle
          </Link>
        </div>
      ) : null}
      {data && data.expenseCount + data.incomeCount > 0 ? (
        <>
          <section className="stat-grid">
            <article className="stat-card">
              <span>
                <CircleDollarSign />
              </span>
              <div>
                <small>Toplam harcama</small>
                <strong>
                  {formatMoneyFromMinor(data.totalExpenseMinor, data.currency)}
                </strong>
                <p>{data.expenseCount} kayıt</p>
              </div>
            </article>
            <article className="stat-card stat-card--gold">
              <span>
                <LineChart />
              </span>
              <div>
                <small>Toplam gelir</small>
                <strong>
                  {formatMoneyFromMinor(data.totalIncomeMinor, data.currency)}
                </strong>
                <p>{data.incomeCount} kayıt</p>
              </div>
            </article>
            <article className="stat-card stat-card--wine">
              <span>
                <BarChart3 />
              </span>
              <div>
                <small>Net akış</small>
                <strong>
                  {formatMoneyFromMinor(data.netCashflowMinor, data.currency)}
                </strong>
                <p>güncel dönem</p>
              </div>
            </article>
          </section>
          <section className="paper-section chart-foundation">
            <span className="eyebrow">Aylık iz</span>
            <h2>Nakit akışı görünümü</h2>
            <div className="chart-bars">
              {data.monthly.slice(-8).map((month) => {
                const expense = Math.abs(Number(month.expenseMinor));
                const income = Math.abs(Number(month.incomeMinor));
                const max = Math.max(
                  ...data.monthly.flatMap((item) => [
                    Math.abs(Number(item.expenseMinor)),
                    Math.abs(Number(item.incomeMinor)),
                  ]),
                  1,
                );
                return (
                  <div key={month.month}>
                    <span className="chart-bars__pair">
                      <i
                        style={{
                          height: `${Math.max(5, (expense / max) * 100)}%`,
                        }}
                      />
                      <i
                        style={{
                          height: `${Math.max(5, (income / max) * 100)}%`,
                        }}
                      />
                    </span>
                    <small>{month.month.slice(5)}</small>
                  </div>
                );
              })}
              {!data.monthly.length ? (
                <div className="chart-empty">
                  <PieChart /> İlk hareketlerle grafik burada oluşacak.
                </div>
              ) : null}
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}
