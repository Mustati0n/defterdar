import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from './query-keys';

export function useSettlementHistory({
  ledgerId,
  planId,
  enabled = true,
}: {
  ledgerId: string | null;
  planId?: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ledgerId
      ? queryKeys.settlements(ledgerId, planId)
      : queryKeys.planSettlements(planId ?? ''),
    queryFn: ({ signal }) =>
      ledgerId
        ? api.settlements.list(ledgerId, planId, signal)
        : api.settlements.listForPlan(planId ?? '', signal),
    enabled: Boolean(enabled && (ledgerId || planId)),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}
