import type { QueryClient } from '@tanstack/react-query';

export interface FinancialInvalidationInput {
  ledgerId: string;
  planIds?: ReadonlyArray<string | null | undefined>;
  expenseId?: string;
  balances?: boolean;
  expenses?: boolean;
  incomes?: boolean;
  settlements?: boolean;
  offsetAvailability?: boolean;
  allPlanAnalytics?: boolean;
}

/**
 * The authoritative invalidation matrix for mutations that affect financial
 * projections or their metadata. Prefix keys deliberately cover every cached
 * filter/range without clearing unrelated query data.
 */
export async function invalidateFinancialData(
  queryClient: QueryClient,
  input: FinancialInvalidationInput,
) {
  const planIds = [
    ...new Set(
      (input.planIds ?? []).filter((planId): planId is string =>
        Boolean(planId),
      ),
    ),
  ];
  const work = [
    queryClient.invalidateQueries({ queryKey: ['overview'] }),
    queryClient.invalidateQueries({
      queryKey: ['ledger-analytics', input.ledgerId],
    }),
    queryClient.invalidateQueries({
      queryKey: ['activity-preview', input.ledgerId],
    }),
    queryClient.invalidateQueries({
      queryKey: ['activity-feed', input.ledgerId],
    }),
  ];

  if (input.balances !== false) {
    work.push(
      queryClient.invalidateQueries({
        queryKey: ['ledger-balance', input.ledgerId],
      }),
    );
  }
  if (input.expenses) {
    work.push(
      queryClient.invalidateQueries({
        queryKey: ['expenses', input.ledgerId],
      }),
    );
  }
  if (input.expenseId) {
    work.push(
      queryClient.invalidateQueries({
        queryKey: ['expense', input.expenseId],
      }),
    );
  }
  if (input.incomes) {
    work.push(
      queryClient.invalidateQueries({
        queryKey: ['incomes', input.ledgerId],
      }),
    );
  }
  if (input.settlements) {
    work.push(
      queryClient.invalidateQueries({
        queryKey: ['settlements', input.ledgerId],
      }),
    );
  }
  if (input.offsetAvailability !== false) {
    work.push(
      queryClient.invalidateQueries({
        queryKey: ['offset-availability', input.ledgerId],
      }),
    );
  }
  if (input.allPlanAnalytics) {
    work.push(
      queryClient.invalidateQueries({ queryKey: ['plan-analytics'] }),
    );
  }

  for (const planId of planIds) {
    work.push(
      queryClient.invalidateQueries({ queryKey: ['plan-balance', planId] }),
      queryClient.invalidateQueries({
        queryKey: ['plan-analytics', planId],
      }),
    );
  }

  await Promise.all(work);
}
