import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from './query-keys';

export function useActivityFeed(ledgerId: string, planId?: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.activityFeed(ledgerId, planId),
    queryFn: ({ pageParam, signal }) =>
      api.ledgers.activity(ledgerId, 20, pageParam, planId, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    maxPages: 5,
    enabled: Boolean(ledgerId),
  });
}
