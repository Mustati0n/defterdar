import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { CreateIncomeInput } from '@/lib/types';
import { invalidateFinancialData } from './financial-invalidation';
import { queryKeys } from './query-keys';

export function useIncomes(ledgerId: string, planId?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.incomes(ledgerId, planId),
    queryFn: ({ signal }) => api.incomes.list(ledgerId, planId, signal),
    enabled: Boolean(ledgerId && enabled),
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
