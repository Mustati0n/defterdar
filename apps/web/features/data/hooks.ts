'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { CreateLedgerInput, CreatePlanInput, Ledger } from '@/lib/types';
import type { CreateExpenseInput, CreateIncomeInput } from '@/lib/types';
import type { UpdateExpenseInput } from '@/lib/types';
import { invalidateFinancialData } from './financial-invalidation';

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

export function useLedgerBalances(ledgers: Ledger[] | undefined) {
  const queries = useQueries({
    queries: (ledgers ?? []).map((ledger) => ({
      queryKey: queryKeys.ledgerBalance(ledger.id),
      queryFn: () => api.ledgers.balances(ledger.id),
    })),
  });

  return {
    balances: queries.flatMap((query) => (query.data ? [query.data] : [])),
    entries: queries.flatMap((query, index) =>
      query.data && ledgers?.[index]
        ? [{ ledger: ledgers[index], balance: query.data }]
        : [],
    ),
    isLoading: queries.some((query) => query.isLoading),
  };
}

export function usePlanBalances(
  plans: Array<{ id: string; name: string }> | undefined,
) {
  const queries = useQueries({
    queries: (plans ?? []).map((plan) => ({
      queryKey: queryKeys.planBalance(plan.id),
      queryFn: () => api.plans.balances(plan.id),
    })),
  });
  return {
    entries: queries.flatMap((query, index) =>
      query.data && plans?.[index]
        ? [{ plan: plans[index], balance: query.data }]
        : [],
    ),
    isLoading: queries.some((query) => query.isLoading),
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
    queryKey: queryKeys.activityPreview(ledgerId),
    queryFn: () => api.ledgers.activity(ledgerId),
    enabled: Boolean(ledgerId),
  });
  const expenses = useExpenses(ledgerId);
  const incomes = useIncomes(ledgerId);

  return { ledger, plans, members, balance, activity, expenses, incomes };
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
  const expenses = useQuery({
    queryKey: queryKeys.expenses(plan.data?.ledgerId ?? '', planId),
    queryFn: () => api.expenses.list(plan.data?.ledgerId ?? '', planId),
    enabled: Boolean(plan.data?.ledgerId && planId),
  });

  return { plan, participants, balance, expenses };
}

export function useExpenses(ledgerId: string, planId?: string) {
  return useQuery({
    queryKey: queryKeys.expenses(ledgerId, planId),
    queryFn: () => api.expenses.list(ledgerId, planId),
    enabled: Boolean(ledgerId),
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
    queryFn: () => api.expenses.get(expenseId),
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
    queryFn: () => api.expenses.attachments(expenseId),
    enabled: Boolean(expenseId),
  });
}

export function useCategories(ledgerId: string) {
  return useQuery({
    queryKey: queryKeys.categories(ledgerId),
    queryFn: () => api.categories.list(ledgerId),
    enabled: Boolean(ledgerId),
  });
}

export function useIncomes(ledgerId: string, planId?: string) {
  return useQuery({
    queryKey: queryKeys.incomes(ledgerId, planId),
    queryFn: () => api.incomes.list(ledgerId, planId),
    enabled: Boolean(ledgerId),
  });
}

export function useActivityFeed(ledgerId: string, planId?: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.activityFeed(ledgerId, planId),
    queryFn: ({ pageParam }) =>
      api.ledgers.activity(ledgerId, 20, pageParam, planId),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
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
