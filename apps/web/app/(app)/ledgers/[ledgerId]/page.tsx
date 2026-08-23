'use client';

import {
  ArrowLeft,
  BookOpenText,
  CircleDollarSign,
  Clock3,
  Crown,
  CheckCircle2,
  Plus,
  ReceiptText,
  Settings,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useLedgerDetailData } from '@/features/data/hooks';
import { useAuth } from '@/features/auth/auth-provider';
import { ActivityFeed } from '@/features/activity/activity-feed';
import {
  LedgerMembersPanel,
  LedgerSettingsPanel,
} from '@/features/ledgers/ledger-management';
import { activitySentence } from '@/lib/activity';
import { ExpenseIndicators } from '@/features/expenses/expense-indicators';
import { formatMoneyFromMinor } from '@/lib/format';

const tabs = [
  { id: 'general', label: 'Genel', icon: BookOpenText },
  { id: 'activity', label: 'Hareketler', icon: Clock3 },
  { id: 'balances', label: 'Bakiyeler', icon: WalletCards },
  { id: 'members', label: 'Üyeler', icon: UsersRound },
  { id: 'settings', label: 'Ayarlar', icon: Settings },
] as const;
type Tab = (typeof tabs)[number]['id'];

export default function LedgerDetailPage() {
  const { ledgerId } = useParams<{ ledgerId: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const { user } = useAuth();
  const { ledger, plans, members, balance, activity, expenses, incomes } =
    useLedgerDetailData(ledgerId);

  if (ledger.isLoading) return <LoadingState label="Defter açılıyor…" />;
  if (ledger.isError || !ledger.data)
    return (
      <ErrorState
        message="Bu deftere erişilemiyor ya da defter artık mevcut değil."
        onRetry={() => void ledger.refetch()}
      />
    );

  const data = ledger.data;
  const myPosition = balance.data?.positions.find(
    (position) => position.user.id === user?.id,
  );

  return (
    <>
      <Link className="back-link" href="/ledgers">
        <ArrowLeft /> Defterliğe dön
      </Link>
      <section className="detail-cover detail-cover--ledger">
        <span className="detail-cover__bookmark">{data.role}</span>
        <div>
          <span className="eyebrow eyebrow--light">
            {data.type === 'PERSONAL' ? 'Kişisel defter' : 'Ortak defter'} ·{' '}
            {data.currency}
          </span>
          <h1>{data.name}</h1>
          <p>{data.description || 'Bu defterin kapak notu henüz boş.'}</p>
        </div>
        <div className="detail-cover__stamp">
          <Crown />
          <span>
            {data.role === 'OWNER'
              ? 'Defter sahibi'
              : data.role === 'ADMIN'
                ? 'Yönetici'
                : 'Defter üyesi'}
          </span>
        </div>
      </section>
      <nav className="detail-tabs" aria-label="Defter bölümleri">
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
              <span className="eyebrow">Defter özeti</span>
              <h2>Masadaki durum</h2>
              <div className="summary-list">
                <div>
                  <UsersRound />
                  <span>
                    <small>Aktif üyeler</small>
                    <strong>{members.data?.length ?? '—'}</strong>
                  </span>
                </div>
                <div>
                  <BookOpenText />
                  <span>
                    <small>Bağlı planlar</small>
                    <strong>{plans.data?.length ?? '—'}</strong>
                  </span>
                </div>
                <div>
                  <CircleDollarSign />
                  <span>
                    <small>Konum</small>
                    <strong>
                      {myPosition
                        ? formatMoneyFromMinor(
                            myPosition.netMinor,
                            data.currency,
                          )
                        : '—'}
                    </strong>
                  </span>
                </div>
              </div>
            </section>
            <section className="lined-section">
              <span className="eyebrow">Son kayıtlar</span>
              <h2>Yakın hareketler</h2>
              <ol className="compact-activity">
                {(activity.data?.items ?? []).slice(0, 5).map((item) => (
                  <li key={item.id}>
                    <span />
                    <div>
                      <strong>{item.actor?.displayName ?? 'Sistem'}</strong>
                      <p>{activitySentence(item)}</p>
                    </div>
                    <time>
                      {new Date(item.createdAt).toLocaleDateString('tr-TR')}
                    </time>
                  </li>
                ))}
                {!activity.data?.items.length ? (
                  <li className="muted-copy">Henüz hareket kaydı yok.</li>
                ) : null}
              </ol>
            </section>
          </div>
          <section className="paper-section expense-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Defter hareketleri</span>
                <h2>Son harcamalar</h2>
              </div>
              {expenses.data?.length && !data.archivedAt ? (
                <Link
                  className="button button--primary button--small"
                  href={`/expenses/new?ledgerId=${ledgerId}`}
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
                  <h3>Bu Defter henüz tertemiz.</h3>
                  <p>
                    {!data.archivedAt
                      ? 'İlk harcamayı eklediğinde Defterdar payları ve bakiyeleri hesaplamaya başlayacak.'
                      : 'Bu Defter arşivde olduğu için yeni harcama eklenemez; mevcut kayıtlar okunmaya devam eder.'}
                  </p>
                </div>
                {!data.archivedAt ? (
                  <Link
                    className="button button--primary"
                    href={`/expenses/new?ledgerId=${ledgerId}`}
                  >
                    <Plus /> İlk harcamayı ekle
                  </Link>
                ) : null}
              </div>
            )}
          </section>
          <div className="detail-grid">
            <section className="paper-section">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Bağlı notlar</span>
                  <h2>Planlar</h2>
                </div>
                {!data.archivedAt ? (
                  <Link
                    className="button button--quiet button--small"
                    href={`/plans?create=1&ledgerId=${ledgerId}`}
                  >
                    <Plus /> Plan ekle
                  </Link>
                ) : null}
              </div>
              <div className="simple-list">
                {(plans.data ?? []).slice(0, 5).map((plan) => (
                  <Link href={`/plans/${plan.id}`} key={plan.id}>
                    <strong>{plan.name}</strong>
                    <small>
                      {plan.status} · {plan.participantCount} katılımcı
                    </small>
                  </Link>
                ))}
                {!plans.data?.length ? (
                  <p className="muted-copy">Bu Deftere bağlı Plan yok.</p>
                ) : null}
              </div>
            </section>
            <section className="paper-section">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Gelen para</span>
                  <h2>Son gelirler</h2>
                </div>
                {!data.archivedAt ? (
                  <Link
                    className="button button--quiet button--small"
                    href={`/incomes/new?ledgerId=${ledgerId}`}
                  >
                    <Plus /> Gelir ekle
                  </Link>
                ) : null}
              </div>
              <div className="simple-list">
                {(incomes.data ?? []).slice(0, 5).map((income) => (
                  <div key={income.id}>
                    <strong>{income.title}</strong>
                    <small>
                      {formatMoneyFromMinor(
                        income.amountMinor,
                        income.currency,
                      )}{' '}
                      ·{' '}
                      {new Date(income.incomeDate).toLocaleDateString('tr-TR')}
                    </small>
                  </div>
                ))}
                {!incomes.data?.length ? (
                  <p className="muted-copy">Henüz gelir kaydı yok.</p>
                ) : null}
              </div>
            </section>
          </div>
        </>
      ) : null}
      {activeTab === 'activity' ? <ActivityFeed ledgerId={ledgerId} /> : null}
      {activeTab === 'balances' ? (
        <section className="paper-section detail-full">
          <span className="eyebrow">Anlık hesap</span>
          <h2>Üye bakiyeleri</h2>
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
      {activeTab === 'members' ? (
        <LedgerMembersPanel ledger={data} members={members.data ?? []} />
      ) : null}
      {activeTab === 'settings' ? (
        <LedgerSettingsPanel ledger={data} members={members.data ?? []} />
      ) : null}
    </>
  );
}
