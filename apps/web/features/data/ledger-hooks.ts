import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { CreateLedgerInput } from '@/lib/types';
import { useExpenses } from './expense-hooks';
import { useIncomes } from './income-hooks';
import { usePlans } from './plan-hooks';
import { queryKeys } from './query-keys';

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
        queryClient.invalidateQueries({ queryKey: queryKeys.ledgersRoot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.overview }),
      ]);
    },
  });
}

export type LedgerDetailView =
  'general' | 'activity' | 'balances' | 'analytics' | 'members' | 'settings';

export function useLedgerDetailData(
  ledgerId: string,
  view: LedgerDetailView = 'general',
) {
  const ledger = useLedger(ledgerId);
  const isCollaborative = Boolean(ledger.data?.isCollaborative);
  const isGeneral = view === 'general';
  const plans = usePlans(ledgerId, false, isGeneral);
  const members = useQuery({
    queryKey: queryKeys.members(ledgerId),
    queryFn: ({ signal }) => api.ledgers.members(ledgerId, signal),
    enabled: Boolean(
      ledgerId && (view === 'members' || isGeneral),
    ),
  });
  const balance = useQuery({
    queryKey: queryKeys.ledgerBalance(ledgerId),
    queryFn: ({ signal }) => api.ledgers.balances(ledgerId, signal),
    enabled: Boolean(
      ledgerId && isCollaborative && (isGeneral || view === 'balances'),
    ),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
  const expenses = useExpenses(ledgerId, undefined, isGeneral);
  const incomes = useIncomes(ledgerId, undefined, isGeneral);

  return { ledger, plans, members, balance, expenses, incomes };
}
