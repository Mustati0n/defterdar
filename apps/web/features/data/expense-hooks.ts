import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { CreateExpenseInput, UpdateExpenseInput } from '@/lib/types';
import { invalidateFinancialData } from './financial-invalidation';
import { queryKeys } from './query-keys';

export function useExpenses(ledgerId: string, planId?: string, enabled = true) {
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
