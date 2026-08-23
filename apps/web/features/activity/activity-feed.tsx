'use client';

import { activitySentence } from '@/lib/activity';
import { useActivityFeed } from '@/features/data/hooks';

export function ActivityFeed({ ledgerId }: { ledgerId: string }) {
  const activity = useActivityFeed(ledgerId);
  const items = activity.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <section className="paper-section detail-full">
      <span className="eyebrow">Kayıt sırası</span>
      <h2>Defter hareketleri</h2>
      <ol className="compact-activity">
        {items.map((item) => (
          <li key={item.id}>
            <span />
            <div>
              <strong>{item.actor?.displayName ?? 'Sistem'}</strong>
              <p>{activitySentence(item)}</p>
            </div>
            <time>{new Date(item.createdAt).toLocaleString('tr-TR')}</time>
          </li>
        ))}
        {!items.length && !activity.isLoading ? (
          <li className="muted-copy">Henüz hareket kaydı yok.</li>
        ) : null}
      </ol>
      {activity.hasNextPage ? (
        <button
          className="button button--quiet"
          type="button"
          disabled={activity.isFetchingNextPage}
          onClick={() => void activity.fetchNextPage()}
        >
          {activity.isFetchingNextPage ? 'Yükleniyor…' : 'Daha fazla göster'}
        </button>
      ) : null}
    </section>
  );
}
