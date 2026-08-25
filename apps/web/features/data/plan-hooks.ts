import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { CreatePlanInput, CreateStandalonePlanInput } from '@/lib/types';
import { queryKeys } from './query-keys';

export function usePlans(
  ledgerId: string,
  includeArchived = false,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.plans(ledgerId, includeArchived),
    queryFn: ({ signal }) => api.plans.list(ledgerId, includeArchived, signal),
    enabled: Boolean(ledgerId && enabled),
  });
}

export function useAllPlans(includeArchived = false, enabled = true) {
  return useQuery({
    queryKey: queryKeys.allPlans(includeArchived),
    queryFn: ({ signal }) => api.plans.listAll(includeArchived, signal),
    enabled,
  });
}

export function usePlan(planId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.plan(planId),
    queryFn: ({ signal }) => api.plans.get(planId, signal),
    enabled: Boolean(planId && enabled),
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      ledgerId,
      input,
    }: {
      ledgerId: string | null;
      input: CreatePlanInput | CreateStandalonePlanInput;
    }) =>
      ledgerId
        ? api.plans.create(ledgerId, input)
        : api.plans.createStandalone(input as CreateStandalonePlanInput),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.plansRoot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.overview }),
      ]);
    },
  });
}

export type PlanDetailView =
  | 'general'
  | 'activity'
  | 'balances'
  | 'analytics'
  | 'participants'
  | 'settings';

export function usePlanDetailData(
  planId: string,
  view: PlanDetailView = 'general',
) {
  const plan = usePlan(planId);
  const participants = useQuery({
    queryKey: queryKeys.participants(planId),
    queryFn: ({ signal }) => api.plans.participants(planId, signal),
    enabled: Boolean(planId && view === 'participants'),
  });
  const balance = useQuery({
    queryKey: queryKeys.planBalance(planId),
    queryFn: ({ signal }) => api.plans.balances(planId, signal),
    enabled: Boolean(planId && view === 'balances'),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
  const expenses = useQuery({
    queryKey: queryKeys.planExpenses(planId),
    queryFn: ({ signal }) => api.expenses.listForPlan(planId, signal),
    enabled: Boolean(planId && view === 'general'),
  });

  return { plan, participants, balance, expenses };
}
