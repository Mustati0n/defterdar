'use client';

import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { CreateLedgerInput, CreatePlanInput, Ledger } from '@/lib/types';

export const queryKeys = {
  me: ['me'] as const,
  ledgers: (includeArchived = false) =>
    ['ledgers', { includeArchived }] as const,
  ledger: (id: string) => ['ledger', id] as const,
  plans: (ledgerId: string, includeArchived = false) =>
    ['plans', ledgerId, { includeArchived }] as const,
  plan: (id: string) => ['plan', id] as const,
  members: (ledgerId: string) => ['members', ledgerId] as const,
  participants: (planId: string) => ['participants', planId] as const,
  ledgerBalance: (ledgerId: string) => ['ledger-balance', ledgerId] as const,
  planBalance: (planId: string) => ['plan-balance', planId] as const,
  activity: (ledgerId: string) => ['activity', ledgerId] as const,
  ledgerAnalytics: (ledgerId: string) =>
    ['ledger-analytics', ledgerId] as const,
  planAnalytics: (planId: string) => ['plan-analytics', planId] as const,
};

export function useLedgers(includeArchived = false) {
  return useQuery({
    queryKey: queryKeys.ledgers(includeArchived),
    queryFn: () => api.ledgers.list(includeArchived),
  });
}

export function useLedger(ledgerId: string) {
  return useQuery({
    queryKey: queryKeys.ledger(ledgerId),
    queryFn: () => api.ledgers.get(ledgerId),
    enabled: Boolean(ledgerId),
  });
}

export function useCreateLedger() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLedgerInput) => api.ledgers.create(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ledgers'] });
    },
  });
}

export function usePlans(ledgerId: string, includeArchived = false) {
  return useQuery({
    queryKey: queryKeys.plans(ledgerId, includeArchived),
    queryFn: () => api.plans.list(ledgerId, includeArchived),
    enabled: Boolean(ledgerId),
  });
}

export function useAllPlans(
  ledgers: Ledger[] | undefined,
  includeArchived = false,
) {
  const queries = useQueries({
    queries: (ledgers ?? []).map((ledger) => ({
      queryKey: queryKeys.plans(ledger.id, includeArchived),
      queryFn: () => api.plans.list(ledger.id, includeArchived),
    })),
  });

  return {
    plans: queries.flatMap((query) => query.data ?? []),
    isLoading: queries.some((query) => query.isLoading),
    isError: queries.some((query) => query.isError),
    refetch: () => Promise.all(queries.map((query) => query.refetch())),
  };
}

export function usePlan(planId: string) {
  return useQuery({
    queryKey: queryKeys.plan(planId),
    queryFn: () => api.plans.get(planId),
    enabled: Boolean(planId),
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      ledgerId,
      input,
    }: {
      ledgerId: string;
      input: CreatePlanInput;
    }) => api.plans.create(ledgerId, input),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ['plans', variables.ledgerId],
      });
    },
  });
}

export function useLedgerDetailData(ledgerId: string) {
  const ledger = useLedger(ledgerId);
  const plans = usePlans(ledgerId);
  const members = useQuery({
    queryKey: queryKeys.members(ledgerId),
    queryFn: () => api.ledgers.members(ledgerId),
    enabled: Boolean(ledgerId),
  });
  const balance = useQuery({
    queryKey: queryKeys.ledgerBalance(ledgerId),
    queryFn: () => api.ledgers.balances(ledgerId),
    enabled: Boolean(ledgerId),
  });
  const activity = useQuery({
    queryKey: queryKeys.activity(ledgerId),
    queryFn: () => api.ledgers.activity(ledgerId),
    enabled: Boolean(ledgerId),
  });

  return { ledger, plans, members, balance, activity };
}

export function usePlanDetailData(planId: string) {
  const plan = usePlan(planId);
  const participants = useQuery({
    queryKey: queryKeys.participants(planId),
    queryFn: () => api.plans.participants(planId),
    enabled: Boolean(planId),
  });
  const balance = useQuery({
    queryKey: queryKeys.planBalance(planId),
    queryFn: () => api.plans.balances(planId),
    enabled: Boolean(planId),
  });

  return { plan, participants, balance };
}
