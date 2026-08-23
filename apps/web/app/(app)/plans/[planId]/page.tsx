'use client';

import {
  ArrowLeft,
  CalendarDays,
  CheckSquare2,
  Clock3,
  Settings,
  Plus,
  ReceiptText,
  CheckCircle2,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { usePlanDetailData } from '@/features/data/hooks';
import { useLedger, useLedgers } from '@/features/data/hooks';
import { useAuth } from '@/features/auth/auth-provider';
import { api } from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/features/data/hooks';
import {
  PlanParticipantsPanel,
  PlanSettingsPanel,
} from '@/features/plans/plan-management';
import { ActivityFeed } from '@/features/activity/activity-feed';
import { ExpenseIndicators } from '@/features/expenses/expense-indicators';
import { formatDate, formatMoneyFromMinor } from '@/lib/format';

const tabs = [
  { id: 'general', label: 'Genel', icon: CheckSquare2 },
  { id: 'activity', label: 'Hareketler', icon: Clock3 },
  { id: 'balances', label: 'Bakiyeler', icon: WalletCards },
  { id: 'participants', label: 'Katılımcılar', icon: UsersRound },
  { id: 'settings', label: 'Ayarlar', icon: Settings },
] as const;
type Tab = (typeof tabs)[number]['id'];

export default function PlanDetailPage() {
  const { planId } = useParams<{ planId: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const { plan, participants, balance, expenses } = usePlanDetailData(planId);
  const { user } = useAuth();
  const ledgers = useLedgers();
  const ledger = useLedger(plan.data?.ledgerId ?? '');
  const members = useQuery({
    queryKey: queryKeys.members(plan.data?.ledgerId ?? ''),
    queryFn: () => api.ledgers.members(plan.data?.ledgerId ?? ''),
    enabled: Boolean(plan.data?.ledgerId),
  });

  if (plan.isLoading) return <LoadingState label="Plan notu açılıyor…" />;
  if (plan.isError || !plan.data)
    return (
      <ErrorState
        message="Bu plana erişilemiyor ya da plan artık mevcut değil."
        onRetry={() => void plan.refetch()}
      />
    );
  const data = plan.data;
  const canAdmin =
    ledger.data?.role === 'OWNER' || ledger.data?.role === 'ADMIN';
  const canEdit =
    canAdmin ||
    (data.createdById === user?.id && ledger.data?.role === 'MEMBER');

  return (
    <>
      <Link className="back-link" href="/plans">
        <ArrowLeft /> Plan panosuna dön
      </Link>
      <section className="detail-cover detail-cover--plan">
        <span className="detail-cover__pin" aria-hidden="true" />
        <div>
          <span className="eyebrow">Plan notu · {data.status}</span>
          <h1>{data.name}</h1>
          <p>{data.description || 'Bu planın açıklama notu henüz boş.'}</p>
        </div>
        <div className="detail-cover__date">
          <CalendarDays />
          <span>
            <small>Başlangıç</small>
            <strong>{formatDate(data.startsAt, 'Serbest')}</strong>
          </span>
        </div>
      </section>
      <nav className="detail-tabs" aria-label="Plan bölümleri">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              className={activeTab === tab.id ? 'is-active' : ''}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              key={tab.id}
            >
              <Icon /> {tab.label}
            </button>
          );
        })}
      </nav>

      {activeTab === 'general' ? (
        <>
          <div className="detail-grid">
            <section className="paper-section">
              <span className="eyebrow">Plan künyesi</span>
              <h2>Takvim ve katılım</h2>
              <div className="summary-list">
                <div>
                  <UsersRound />
                  <span>
                    <small>Katılımcılar</small>
                    <strong>{data.participantCount}</strong>
                  </span>
                </div>
                <div>
                  <CalendarDays />
                  <span>
                    <small>Bitiş</small>
                    <strong>{formatDate(data.endsAt, 'Açık')}</strong>
                  </span>
                </div>
                <div>
                  <CheckSquare2 />
                  <span>
                    <small>Durum</small>
                    <strong>{data.status}</strong>
                  </span>
                </div>
              </div>
            </section>
            <section className="lined-section">
              <span className="eyebrow">Plan notu</span>
              <h2>Sıradaki adım</h2>
              <ul className="placeholder-checklist">
                <li>
                  <span /> Katılımcıları netleştir
                </li>
                <li>
                  <span /> İlk ortak harcamayı ekle
                </li>
                <li>
                  <span /> Bittiğinde hesabı kapat
                </li>
              </ul>
            </section>
          </div>
          <section className="paper-section expense-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Plan harcamaları</span>
                <h2>Birlikte ödenenler</h2>
              </div>
              {expenses.data?.length && data.status === 'ACTIVE' ? (
                <Link
                  className="button button--primary button--small"
                  href={`/expenses/new?ledgerId=${data.ledgerId}&planId=${planId}`}
                >
                  <Plus /> Harcama ekle
                </Link>
              ) : null}
            </div>
            {expenses.data?.length ? (
              <div className="expense-list">
                {expenses.data.slice(0, 6).map((expense) => (
                  <Link href={`/expenses/${expense.id}`} key={expense.id}>
                    <span>
                      <ReceiptText />
                    </span>
                    <div>
                      <strong>{expense.title}</strong>
                      <small>
                        {expense.payer.displayName} ödedi ·{' '}
                        {expense.splits.length} kişi paylaştı
                      </small>
                      <ExpenseIndicators expense={expense} />
                    </div>
                    <div>
                      <strong>
                        {formatMoneyFromMinor(
                          expense.amountMinor,
                          expense.currency,
                        )}
                      </strong>
                      <small>
                        {new Date(expense.expenseDate).toLocaleDateString(
                          'tr-TR',
                        )}
                      </small>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="smart-empty smart-empty--expense">
                <span>
                  <ReceiptText />
                </span>
                <div>
                  <h3>Bu Plan henüz tertemiz.</h3>
                  <p>
                    {data.status === 'ACTIVE'
                      ? 'İlk harcamayı eklediğinde Planın payları ve bakiyeleri burada oluşacak.'
                      : 'Bu Plan tamamlandığı için yeni harcama eklenemez; mevcut kayıtlar okunmaya devam eder.'}
                  </p>
                </div>
                {data.status === 'ACTIVE' ? (
                  <Link
                    className="button button--primary"
                    href={`/expenses/new?ledgerId=${data.ledgerId}&planId=${planId}`}
                  >
                    <Plus /> İlk harcamayı ekle
                  </Link>
                ) : null}
              </div>
            )}
          </section>
        </>
      ) : null}
      {activeTab === 'activity' ? (
        <ActivityFeed ledgerId={data.ledgerId} />
      ) : null}
      {activeTab === 'balances' ? (
        <section className="paper-section detail-full">
          <span className="eyebrow">Anlık hesap</span>
          <h2>Plan bakiyeleri</h2>
          <div className="balance-list">
            {(balance.data?.positions ?? []).map((position) => (
              <div key={position.user.id}>
                <span className="avatar avatar--paper">
                  {position.user.displayName[0]}
                </span>
                <strong>{position.user.displayName}</strong>
                <span
                  className={
                    position.netMinor < 0 ? 'money-negative' : 'money-positive'
                  }
                >
                  {formatMoneyFromMinor(
                    position.netMinor,
                    balance.data?.currency,
                  )}
                </span>
              </div>
            ))}
            {!balance.data?.positions.length ? (
              <div className="closed-balance">
                <CheckCircle2 />
                <div>
                  <strong>Hesaplar kapalı</strong>
                  <p>Şu anda kimsenin kimseye ödemesi yok.</p>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
      {activeTab === 'participants' ? (
        <PlanParticipantsPanel
          plan={data}
          participants={participants.data ?? []}
          members={members.data ?? []}
          canManage={Boolean(canEdit)}
        />
      ) : null}
      {activeTab === 'settings' ? (
        <PlanSettingsPanel
          plan={data}
          ledgers={ledgers.data ?? []}
          canEdit={Boolean(canEdit)}
          canAdmin={Boolean(canAdmin)}
        />
      ) : null}
    </>
  );
}
