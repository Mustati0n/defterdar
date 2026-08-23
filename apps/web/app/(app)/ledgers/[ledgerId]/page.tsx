'use client';

import {
  ArrowLeft,
  BookOpenText,
  CircleDollarSign,
  Clock3,
  Crown,
  Settings,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useLedgerDetailData } from '@/features/data/hooks';
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
  const { ledger, plans, members, balance, activity } =
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
    (position) => position.user.id === data.ownerId,
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
                      ? formatMoneyFromMinor(myPosition.netMinor, data.currency)
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
                    <p>
                      {item.entityType} · {item.action}
                    </p>
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
      ) : null}
      {activeTab === 'activity' ? (
        <section className="paper-section detail-full">
          <span className="eyebrow">Kayıt sırası</span>
          <h2>Tüm son hareketler</h2>
          <ol className="compact-activity">
            {(activity.data?.items ?? []).map((item) => (
              <li key={item.id}>
                <span />
                <div>
                  <strong>{item.actor?.displayName ?? 'Sistem'}</strong>
                  <p>
                    {item.entityType} kaydında {item.action}
                  </p>
                </div>
                <time>{new Date(item.createdAt).toLocaleString('tr-TR')}</time>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
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
              <p className="muted-copy">Henüz hesaplanacak bir bakiye yok.</p>
            ) : null}
          </div>
        </section>
      ) : null}
      {activeTab === 'members' ? (
        <section className="paper-section detail-full">
          <span className="eyebrow">Defter çevresi</span>
          <h2>Aktif üyeler</h2>
          <div className="people-grid">
            {(members.data ?? []).map((member) => (
              <article key={member.user.id}>
                <span className="avatar avatar--paper">
                  {member.user.displayName[0]}
                </span>
                <div>
                  <strong>{member.user.displayName}</strong>
                  <small>{member.role}</small>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      {activeTab === 'settings' ? (
        <section className="paper-section detail-full">
          <span className="eyebrow">Yapı taşı</span>
          <h2>Defter ayarları için hazır alan</h2>
          <p className="muted-copy">
            Ad, açıklama, üyelik ve arşiv yönetimi sonraki özellik katmanlarında
            bu bölümde yaşayacak.
          </p>
        </section>
      ) : null}
    </>
  );
}
