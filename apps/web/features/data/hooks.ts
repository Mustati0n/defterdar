'use client';

import { useEffect } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { CreateLedgerInput, CreatePlanInput } from '@/lib/types';
import type { CreateExpenseInput, CreateIncomeInput } from '@/lib/types';
import type { UpdateExpenseInput } from '@/lib/types';
import { invalidateFinancialData } from './financial-invalidation';

export const queryKeys = {
  me: ['me'] as const,
  overview: ['overview'] as const,
  ledgers: (includeArchived = false) =>
    ['ledgers', { includeArchived }] as const,
  ledger: (id: string) => ['ledger', id] as const,
  plans: (ledgerId: string, includeArchived = false) =>
    ['plans', ledgerId, { includeArchived }] as const,
  allPlans: (includeArchived = false) =>
    ['plans', 'all', { includeArchived }] as const,
  plan: (id: string) => ['plan', id] as const,
  members: (ledgerId: string) => ['members', ledgerId] as const,
  participants: (planId: string) => ['participants', planId] as const,
  ledgerBalance: (ledgerId: string) => ['ledger-balance', ledgerId] as const,
  planBalance: (planId: string) => ['plan-balance', planId] as const,
  activityPreview: (ledgerId: string) =>
    ['activity-preview', ledgerId] as const,
  activityFeed: (ledgerId: string, planId?: string) =>
    ['activity-feed', ledgerId, { planId }] as const,
  activityFeedPrefix: (ledgerId: string) =>
    ['activity-feed', ledgerId] as const,
  ledgerAnalyticsPrefix: (ledgerId: string) =>
    ['ledger-analytics', ledgerId] as const,
  ledgerAnalytics: (ledgerId: string, from?: string, to?: string) =>
    ['ledger-analytics', ledgerId, { from, to }] as const,
  planAnalyticsPrefix: (planId: string) =>
    ['plan-analytics', planId] as const,
  planAnalytics: (planId: string, from?: string, to?: string) =>
    ['plan-analytics', planId, { from, to }] as const,
  expenses: (ledgerId: string, planId?: string) =>
    ['expenses', ledgerId, { planId }] as const,
  expense: (expenseId: string) => ['expense', expenseId] as const,
  attachments: (expenseId: string) => ['attachments', expenseId] as const,
  categories: (ledgerId: string) => ['categories', ledgerId] as const,
  incomes: (ledgerId: string, planId?: string) =>
    ['incomes', ledgerId, { planId }] as const,
  income: (incomeId: string) => ['income', incomeId] as const,
  invitations: (ledgerId: string) => ['invitations', ledgerId] as const,
  settlements: (ledgerId: string, planId?: string) =>
    ['settlements', ledgerId, { planId }] as const,
  offsetAvailability: (ledgerId: string, expenseSplitId: string) =>
    ['offset-availability', ledgerId, expenseSplitId] as const,
  offsetAvailabilityPrefix: (ledgerId: string) =>
    ['offset-availability', ledgerId] as const,
};

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

export function useLedgers(includeArchived = false, enabled = true) {
  return useQuery({
    queryKey: queryKeys.ledgers(includeArchived),
    queryFn: ({ signal }) => api.ledgers.list(includeArchived, signal),
    enabled,
  });
}

export function useLedger(ledgerId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.ledger(ledgerId),
    queryFn: ({ signal }) => api.ledgers.get(ledgerId, signal),
    enabled: Boolean(ledgerId && enabled),
  });
}

export function useCreateLedger() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLedgerInput) => api.ledgers.create(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ledgers'] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.overview }),
      ]);
    },
  });
}

export function usePlans(
  ledgerId: string,
  includeArchived = false,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.plans(ledgerId, includeArchived),
    queryFn: ({ signal }) =>
      api.plans.list(ledgerId, includeArchived, signal),
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
      ledgerId: string;
      input: CreatePlanInput;
    }) => api.plans.create(ledgerId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['plans'] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.overview }),
      ]);
    },
  });
}

export type LedgerDetailView =
  | 'general'
  | 'activity'
  | 'balances'
  | 'analytics'
  | 'members'
  | 'settings';

export function useLedgerDetailData(
  ledgerId: string,
  view: LedgerDetailView = 'general',
) {
  const ledger = useLedger(ledgerId);
  const isShared = ledger.data?.type === 'SHARED';
  const effectiveView =
    ledger.data?.type === 'PERSONAL' &&
    (view === 'balances' || view === 'members')
      ? 'general'
      : view;
  const isGeneral = effectiveView === 'general';
  const plans = usePlans(ledgerId, false, isGeneral);
  const members = useQuery({
    queryKey: queryKeys.members(ledgerId),
    queryFn: ({ signal }) => api.ledgers.members(ledgerId, signal),
    enabled: Boolean(
      ledgerId && (effectiveView === 'members' || (isGeneral && isShared)),
    ),
  });
  const balance = useQuery({
    queryKey: queryKeys.ledgerBalance(ledgerId),
    queryFn: ({ signal }) => api.ledgers.balances(ledgerId, signal),
    enabled: Boolean(
      ledgerId && isShared && (isGeneral || effectiveView === 'balances'),
    ),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
  const activity = useQuery({
    queryKey: queryKeys.activityPreview(ledgerId),
    queryFn: ({ signal }) =>
      api.ledgers.activity(ledgerId, 12, undefined, undefined, signal),
    enabled: Boolean(ledgerId && isGeneral),
  });
  const expenses = useExpenses(ledgerId, undefined, isGeneral);
  const incomes = useIncomes(
    ledgerId,
    undefined,
    Boolean(isGeneral && ledger.data?.type === 'PERSONAL'),
  );

  return { ledger, plans, members, balance, activity, expenses, incomes };
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
    queryKey: queryKeys.expenses(plan.data?.ledgerId ?? '', planId),
    queryFn: ({ signal }) =>
      api.expenses.list(plan.data?.ledgerId ?? '', planId, signal),
    enabled: Boolean(
      plan.data?.ledgerId && planId && view === 'general',
    ),
  });

  return { plan, participants, balance, expenses };
}

export function useExpenses(
  ledgerId: string,
  planId?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.expenses(ledgerId, planId),
    queryFn: ({ signal }) => api.expenses.list(ledgerId, planId, signal),
    enabled: Boolean(ledgerId && enabled),
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      ledgerId,
      input,
    }: {
      ledgerId: string;
      input: CreateExpenseInput;
    }) => api.expenses.create(ledgerId, input),
    onSuccess: async (_, variables) => {
      await invalidateFinancialData(queryClient, {
        ledgerId: variables.ledgerId,
        planIds: [variables.input.planId],
        expenses: true,
      });
    },
  });
}

export function useExpense(expenseId: string) {
  return useQuery({
    queryKey: queryKeys.expense(expenseId),
    queryFn: ({ signal }) => api.expenses.get(expenseId, signal),
    enabled: Boolean(expenseId),
  });
}

export function useUpdateExpense(expenseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateExpenseInput) =>
      api.expenses.update(expenseId, input),
    onMutate: () => ({
      previous: queryClient.getQueryData<
        Awaited<ReturnType<typeof api.expenses.get>>
      >(queryKeys.expense(expenseId)),
    }),
    onSuccess: async (expense, _variables, context) => {
      queryClient.setQueryData(queryKeys.expense(expenseId), expense);
      await invalidateFinancialData(queryClient, {
        ledgerId: expense.ledgerId,
        planIds: [context.previous?.planId, expense.planId],
        expenseId,
        expenses: true,
      });
    },
    onError: async (_error, variables, context) => {
      const previous = context?.previous;
      if (!previous) return;
      await invalidateFinancialData(queryClient, {
        ledgerId: previous.ledgerId,
        planIds: [previous.planId, variables.planId],
        expenseId,
        expenses: true,
      });
    },
  });
}

export function useVoidExpense(expenseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.expenses.void(expenseId),
    onSuccess: async (expense) => {
      queryClient.setQueryData(queryKeys.expense(expenseId), expense);
      await invalidateFinancialData(queryClient, {
        ledgerId: expense.ledgerId,
        planIds: [expense.planId],
        expenseId,
        expenses: true,
      });
    },
    onError: async () => {
      const expense = queryClient.getQueryData<
        Awaited<ReturnType<typeof api.expenses.get>>
      >(queryKeys.expense(expenseId));
      if (!expense) return;
      await invalidateFinancialData(queryClient, {
        ledgerId: expense.ledgerId,
        planIds: [expense.planId],
        expenseId,
        expenses: true,
      });
    },
  });
}

export function useExpenseAttachments(expenseId: string) {
  return useQuery({
    queryKey: queryKeys.attachments(expenseId),
    queryFn: ({ signal }) => api.expenses.attachments(expenseId, signal),
    enabled: Boolean(expenseId),
  });
}

export function useCategories(ledgerId: string) {
  return useQuery({
    queryKey: queryKeys.categories(ledgerId),
    queryFn: ({ signal }) => api.categories.list(ledgerId, signal),
    enabled: Boolean(ledgerId),
  });
}

export function useIncomes(
  ledgerId: string,
  planId?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.incomes(ledgerId, planId),
    queryFn: ({ signal }) => api.incomes.list(ledgerId, planId, signal),
    enabled: Boolean(ledgerId && enabled),
  });
}

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

export function useCreateIncome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      ledgerId,
      input,
    }: {
      ledgerId: string;
      input: CreateIncomeInput;
    }) => api.incomes.create(ledgerId, input),
    onSuccess: async (_, variables) => {
      await invalidateFinancialData(queryClient, {
        ledgerId: variables.ledgerId,
        planIds: [variables.input.planId],
        balances: false,
        offsetAvailability: false,
        incomes: true,
      });
    },
  });
}

export function useUpdateIncome(incomeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<CreateIncomeInput>) =>
      api.incomes.update(incomeId, input),
    onMutate: () => ({
      previous: queryClient.getQueryData<
        Awaited<ReturnType<typeof api.incomes.get>>
      >(queryKeys.income(incomeId)),
    }),
    onSuccess: async (income, _variables, context) => {
      queryClient.setQueryData(queryKeys.income(incomeId), income);
      await invalidateFinancialData(queryClient, {
        ledgerId: income.ledgerId,
        planIds: [context.previous?.planId, income.planId],
        balances: false,
        offsetAvailability: false,
        incomes: true,
      });
    },
  });
}

export function useVoidIncome(incomeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.incomes.void(incomeId),
    onSuccess: async (income) => {
      queryClient.setQueryData(queryKeys.income(incomeId), income);
      await invalidateFinancialData(queryClient, {
        ledgerId: income.ledgerId,
        planIds: [income.planId],
        balances: false,
        offsetAvailability: false,
        incomes: true,
      });
    },
  });
}
