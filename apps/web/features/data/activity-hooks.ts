import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from './query-keys';

export function useActivityFeed(ledgerId: string | null, planId?: string) {
  return useInfiniteQuery({
    queryKey: ledgerId
      ? queryKeys.activityFeed(ledgerId, planId)
      : queryKeys.planActivity(planId ?? ''),
    queryFn: ({ pageParam, signal }) =>
      ledgerId
        ? api.ledgers.activity(ledgerId, 20, pageParam, planId, signal)
        : api.plans.activity(planId ?? '', 20, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    maxPages: 5,
    enabled: Boolean(ledgerId || planId),
  });
}
