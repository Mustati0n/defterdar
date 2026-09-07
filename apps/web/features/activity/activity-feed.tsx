'use client';

import { activitySentence } from '@/lib/activity';
import { useActivityFeed } from '@/features/data/hooks';
import { ErrorState, LoadingState } from '@/components/ui/states';

export function ActivityFeed({
  ledgerId,
  planId,
  showHeading = true,
}: {
  ledgerId: string | null;
  planId?: string;
  showHeading?: boolean;
}) {
  const activity = useActivityFeed(ledgerId, planId);
  const items = activity.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <section className="paper-section detail-full">
      {showHeading ? (
        <>
          <span className="eyebrow">Kayıt geçmişi</span>
          <h2>{planId ? 'Plan hareketleri' : 'Defter hareketleri'}</h2>
        </>
      ) : null}
      {activity.isLoading ? (
        <LoadingState label="Hareketler yükleniyor…" />
      ) : null}
      {activity.isError ? (
        <ErrorState
          message="Hareket geçmişi şu anda yüklenemedi."
          onRetry={() => void activity.refetch()}
        />
      ) : null}
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
        {!items.length && !activity.isLoading && !activity.isError ? (
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
