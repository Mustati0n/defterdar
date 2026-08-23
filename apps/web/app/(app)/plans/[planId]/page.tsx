'use client';

import {
  ArrowLeft,
  CalendarDays,
  CheckSquare2,
  Clock3,
  Settings,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { usePlanDetailData } from '@/features/data/hooks';
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
  const { plan, participants, balance } = usePlanDetailData(planId);

  if (plan.isLoading) return <LoadingState label="Plan notu açılıyor…" />;
  if (plan.isError || !plan.data)
    return (
      <ErrorState
        message="Bu plana erişilemiyor ya da plan artık mevcut değil."
        onRetry={() => void plan.refetch()}
      />
    );
  const data = plan.data;

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
            <span className="eyebrow">Kısa liste</span>
            <h2>Plan çalışma alanı</h2>
            <ul className="placeholder-checklist">
              <li>
                <span /> Harcamalar ve gelirler burada özetlenecek
              </li>
              <li>
                <span /> Katılımcı hesapları burada karşılaştırılacak
              </li>
              <li>
                <span /> Plan akışı burada izlenecek
              </li>
            </ul>
          </section>
        </div>
      ) : null}
      {activeTab === 'activity' ? (
        <section className="paper-section detail-full">
          <span className="eyebrow">Yapı taşı</span>
          <h2>Plan hareketleri için hazır alan</h2>
          <p className="muted-copy">
            Plan bağlantılı hareketler, sonraki özellik katmanında bu
            kronolojiye bağlanacak.
          </p>
        </section>
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
              <p className="muted-copy">Henüz hesaplanacak bir bakiye yok.</p>
            ) : null}
          </div>
        </section>
      ) : null}
      {activeTab === 'participants' ? (
        <section className="paper-section detail-full">
          <span className="eyebrow">Bu plandaki insanlar</span>
          <h2>Katılımcılar</h2>
          <div className="people-grid">
            {(participants.data ?? []).map((participant) => (
              <article key={participant.user.id}>
                <span className="avatar avatar--paper">
                  {participant.user.displayName[0]}
                </span>
                <div>
                  <strong>{participant.user.displayName}</strong>
                  <small>Katılımcı</small>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      {activeTab === 'settings' ? (
        <section className="paper-section detail-full">
          <span className="eyebrow">Yapı taşı</span>
          <h2>Plan ayarları için hazır alan</h2>
          <p className="muted-copy">
            Plan adı, tarihler, durum ve bağlı defter yönetimi burada yaşayacak.
          </p>
        </section>
      ) : null}
    </>
  );
}
