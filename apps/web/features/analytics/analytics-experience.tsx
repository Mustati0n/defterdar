'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CircleDollarSign,
  PieChart,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { queryKeys } from '@/features/data/hooks';
import { api } from '@/lib/api-client';
import { formatMoneyFromMinor } from '@/lib/format';
import type { AnalyticsSummary, PlanStatus } from '@/lib/types';
import {
  analyticsDateRange,
  analyticsPresets,
  type AnalyticsPreset,
} from './analytics-date';

function monthLabel(month: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(`${month}-01T00:00:00Z`));
}

export function AnalyticsView({
  data,
  personal = false,
  planStatus,
  participantCount,
}: {
  data: AnalyticsSummary;
  personal?: boolean;
  planStatus?: PlanStatus;
  participantCount?: number;
}) {
  const activityCount = data.expenseCount + data.incomeCount;
  const categoryRows = [...data.byCategory].sort(
    (a, b) => Number(b.expenseMinor) - Number(a.expenseMinor),
  );
  const largestCategory = categoryRows[0];
  const chartMaximum = Math.max(
    ...data.monthly.flatMap((month) => [
      Math.abs(Number(month.expenseMinor)),
      Math.abs(Number(month.incomeMinor)),
    ]),
    1,
  );

  if (activityCount === 0) {
    return (
      <div className="analytics-empty" role="status">
        <PieChart />
        <div>
          <h3>Bu dönemde kayıtlı hareket yok.</h3>
          <p>
            Tarih aralığını genişletebilir veya ilk hareketini ekleyebilirsin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-experience" aria-live="polite">
      {planStatus === 'COMPLETED' ? (
        <section className="analytics-final-summary">
          <span className="eyebrow">Plan tamamlandı</span>
          <h2>Hesabın son özeti</h2>
          <div>
            <strong>
              {formatMoneyFromMinor(data.totalExpenseMinor, data.currency)}
            </strong>
            <span>{activityCount} hareket</span>
            {participantCount ? <span>{participantCount} kişi</span> : null}
          </div>
          {data.currentBalances.suggestions.length ? (
            <p>
              Kapanmayı bekleyen ödemeler var; Bakiyeler bölümünden
              tamamlayabilirsin.
            </p>
          ) : (
            <p>Bu Planın hesabı kapalı.</p>
          )}
        </section>
      ) : null}

      <section className="analytics-summary-grid" aria-label="Finansal özet">
        <article>
          <span>
            <ArrowDownRight />
          </span>
          <small>Harcama</small>
          <strong>
            {formatMoneyFromMinor(data.totalExpenseMinor, data.currency)}
          </strong>
          <p>{data.expenseCount} kayıt</p>
        </article>
        <article>
          <span>
            <ArrowUpRight />
          </span>
          <small>Gelir</small>
          <strong>
            {formatMoneyFromMinor(data.totalIncomeMinor, data.currency)}
          </strong>
          <p>{data.incomeCount} kayıt</p>
        </article>
        <article>
          <span>
            <CircleDollarSign />
          </span>
          <small>Net</small>
          <strong>
            {formatMoneyFromMinor(data.netCashflowMinor, data.currency)}
          </strong>
          <p>gelir − harcama</p>
        </article>
      </section>

      {largestCategory && Number(largestCategory.expenseMinor) > 0 ? (
        <p className="analytics-insight">
          Bu dönemde en çok{' '}
          <strong>{largestCategory.category?.name ?? 'Kategorisiz'}</strong>{' '}
          için harcadın:{' '}
          {formatMoneyFromMinor(largestCategory.expenseMinor, data.currency)}.
        </p>
      ) : null}

      <div className="analytics-grid">
        <section className="paper-section analytics-chart-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Aylık iz</span>
              <h2>Harcama ve gelir</h2>
            </div>
            <span className="analytics-legend">
              <i /> Harcama <i /> Gelir
            </span>
          </div>
          <div
            className="analytics-bars"
            role="img"
            aria-label="Aylara göre harcama ve gelir grafiği"
          >
            {data.monthly.map((month) => (
              <div className="analytics-bars__month" key={month.month}>
                <span className="analytics-bars__columns">
                  <i
                    aria-hidden="true"
                    style={
                      {
                        '--bar-size': Math.max(
                          0.04,
                          Math.abs(Number(month.expenseMinor)) / chartMaximum,
                        ),
                      } as React.CSSProperties
                    }
                  />
                  <i
                    aria-hidden="true"
                    style={
                      {
                        '--bar-size': Math.max(
                          0.04,
                          Math.abs(Number(month.incomeMinor)) / chartMaximum,
                        ),
                      } as React.CSSProperties
                    }
                  />
                </span>
                <small>{monthLabel(month.month)}</small>
              </div>
            ))}
          </div>
          <ul className="analytics-data-list" aria-label="Aylık değerler">
            {data.monthly.map((month) => (
              <li key={month.month}>
                <strong>{monthLabel(month.month)}</strong>
                <span>
                  Harcama{' '}
                  {formatMoneyFromMinor(month.expenseMinor, data.currency)}
                </span>
                <span>
                  Gelir {formatMoneyFromMinor(month.incomeMinor, data.currency)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="paper-section analytics-category-card">
          <span className="eyebrow">Nereye gitti?</span>
          <h2>Kategoriler</h2>
          <div className="analytics-category-list">
            {categoryRows.map((row) => {
              const amount = Math.abs(Number(row.expenseMinor));
              const max = Math.max(
                ...categoryRows.map((item) =>
                  Math.abs(Number(item.expenseMinor)),
                ),
                1,
              );
              return (
                <div key={row.category?.id ?? 'uncategorized'}>
                  <span>
                    <strong>{row.category?.name ?? 'Kategorisiz'}</strong>
                    <small>
                      {formatMoneyFromMinor(row.expenseMinor, data.currency)}
                    </small>
                  </span>
                  <i aria-hidden="true">
                    <b
                      style={
                        {
                          '--category-size': amount / max,
                        } as React.CSSProperties
                      }
                    />
                  </i>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {!personal ? (
        <div className="analytics-grid analytics-grid--members">
          <MemberAmounts
            title="Kim ne kadar ödedi?"
            icon={WalletCards}
            rows={data.paidByMember}
            currency={data.currency}
          />
          <MemberAmounts
            title="Kim ne kadar paylaştı?"
            icon={UsersRound}
            rows={data.shareByMember}
            currency={data.currency}
          />
        </div>
      ) : null}

      {!personal && data.currentBalances.positions.length ? (
        <section className="paper-section analytics-balance-list">
          <span className="eyebrow">Bugünkü durum</span>
          <h2>Güncel bakiyeler</h2>
          {data.currentBalances.positions.map((position) => (
            <div key={position.user.id}>
              <strong>{position.user.displayName}</strong>
              <span
                className={
                  position.netMinor < 0
                    ? 'is-negative'
                    : position.netMinor > 0
                      ? 'is-positive'
                      : ''
                }
              >
                {formatMoneyFromMinor(position.netMinor, data.currency)}
              </span>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}

function MemberAmounts({
  title,
  icon: Icon,
  rows,
  currency,
}: {
  title: string;
  icon: typeof UsersRound;
  rows: AnalyticsSummary['paidByMember'];
  currency: string;
}) {
  return (
    <section className="paper-section analytics-member-card">
      <span className="analytics-member-card__icon">
        <Icon />
      </span>
      <h2>{title}</h2>
      {rows.map((row) => (
        <div key={row.user.id}>
          <span>{row.user.displayName}</span>
          <strong>{formatMoneyFromMinor(row.amountMinor, currency)}</strong>
        </div>
      ))}
      {!rows.length ? (
        <p className="muted-copy">Bu dönemde üye hareketi yok.</p>
      ) : null}
    </section>
  );
}

export function AnalyticsExperience({
  scope,
  resourceId,
  personal,
  planStatus,
  participantCount,
}: {
  scope: 'ledger' | 'plan';
  resourceId: string;
  personal?: boolean;
  planStatus?: PlanStatus;
  participantCount?: number;
}) {
  const [preset, setPreset] = useState<AnalyticsPreset>(
    scope === 'plan' ? 'all' : 'month',
  );
  const [custom, setCustom] = useState({ from: '', to: '' });
  const range = useMemo(
    () => analyticsDateRange(preset, new Date(), custom),
    [preset, custom],
  );
  const analytics = useQuery({
    queryKey:
      scope === 'ledger'
        ? queryKeys.ledgerAnalytics(resourceId, range.from, range.to)
        : queryKeys.planAnalytics(resourceId, range.from, range.to),
    queryFn: ({ signal }) =>
      scope === 'ledger'
        ? api.ledgers.analytics(resourceId, range.from, range.to, signal)
        : api.plans.analytics(resourceId, range.from, range.to, signal),
    enabled: Boolean(resourceId),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  return (
    <section className="analytics-workspace">
      <div className="analytics-filters" aria-label="İstatistik tarih aralığı">
        <div
          className="segmented-control"
          role="group"
          aria-label="Tarih seçenekleri"
        >
          {analyticsPresets.map((item) => (
            <button
              type="button"
              className={preset === item.id ? 'is-active' : ''}
              aria-pressed={preset === item.id}
              onClick={() => setPreset(item.id)}
              key={item.id}
            >
              {item.label}
            </button>
          ))}
        </div>
        {preset === 'custom' ? (
          <div className="analytics-custom-dates">
            <label className="field">
              <span>Başlangıç</span>
              <input
                className="input"
                type="date"
                value={custom.from}
                onChange={(event) =>
                  setCustom((current) => ({
                    ...current,
                    from: event.target.value,
                  }))
                }
              />
            </label>
            <label className="field">
              <span>Bitiş</span>
              <input
                className="input"
                type="date"
                value={custom.to}
                min={custom.from}
                onChange={(event) =>
                  setCustom((current) => ({
                    ...current,
                    to: event.target.value,
                  }))
                }
              />
            </label>
          </div>
        ) : null}
      </div>
      {analytics.isFetching && analytics.data ? (
        <p className="analytics-refresh" role="status">
          <BarChart3 /> Rakamlar güncelleniyor…
        </p>
      ) : null}
      {analytics.isLoading ? (
        <LoadingState label="Rakamlar hesaplanıyor…" />
      ) : null}
      {analytics.isError ? (
        <ErrorState
          message="İstatistikler şu anda hesaplanamadı."
          onRetry={() => void analytics.refetch()}
        />
      ) : null}
      {analytics.data ? (
        <AnalyticsView
          data={analytics.data}
          personal={personal}
          planStatus={planStatus}
          participantCount={participantCount}
        />
      ) : null}
    </section>
  );
}
