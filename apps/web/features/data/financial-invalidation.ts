import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

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
    queryClient.invalidateQueries({ queryKey: queryKeys.overview }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.ledgerAnalyticsPrefix(input.ledgerId),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.activityPreview(input.ledgerId),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.activityFeedPrefix(input.ledgerId),
    }),
  ];

  if (input.balances !== false) {
    work.push(
      queryClient.invalidateQueries({
        queryKey: queryKeys.ledgerBalance(input.ledgerId),
      }),
    );
  }
  if (input.expenses) {
    work.push(
      queryClient.invalidateQueries({
        queryKey: queryKeys.expensesPrefix(input.ledgerId),
      }),
    );
  }
  if (input.expenseId) {
    work.push(
      queryClient.invalidateQueries({
        queryKey: queryKeys.expense(input.expenseId),
      }),
    );
  }
  if (input.incomes) {
    work.push(
      queryClient.invalidateQueries({
        queryKey: queryKeys.incomesPrefix(input.ledgerId),
      }),
    );
  }
  if (input.settlements) {
    work.push(
      queryClient.invalidateQueries({
        queryKey: queryKeys.settlementsPrefix(input.ledgerId),
      }),
    );
  }
  if (input.offsetAvailability !== false) {
    work.push(
      queryClient.invalidateQueries({
        queryKey: queryKeys.offsetAvailabilityPrefix(input.ledgerId),
      }),
    );
  }
  if (input.allPlanAnalytics) {
    work.push(
      queryClient.invalidateQueries({ queryKey: queryKeys.planAnalyticsRoot }),
    );
  }

  for (const planId of planIds) {
    work.push(
      queryClient.invalidateQueries({
        queryKey: queryKeys.planBalance(planId),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.planAnalyticsPrefix(planId),
      }),
    );
  }

  await Promise.all(work);
}
