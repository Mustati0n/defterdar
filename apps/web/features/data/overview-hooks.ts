import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from './query-keys';

export function useOverview() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.overview,
    queryFn: ({ signal }) => api.overview.get(signal),
    staleTime: 30_000,
  });
  useEffect(() => {
    if (!query.data) return;
    queryClient.setQueryData(queryKeys.ledgers(false), query.data.ledgers);
    queryClient.setQueryData(queryKeys.allPlans(false), query.data.plans);
    for (const { ledgerId, balance } of query.data.ledgerBalances) {
      queryClient.setQueryData(queryKeys.ledgerBalance(ledgerId), balance);
    }
    for (const { planId, balance } of query.data.planBalances) {
      queryClient.setQueryData(queryKeys.planBalance(planId), balance);
    }
    const firstLedgerId = query.data.ledgers[0]?.id;
    if (firstLedgerId && query.data.activity) {
      queryClient.setQueryData(
        queryKeys.activityPreview(firstLedgerId),
        query.data.activity,
      );
    }
  }, [query.data, queryClient]);
  return query;
}
