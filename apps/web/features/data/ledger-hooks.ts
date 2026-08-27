import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { CreateLedgerInput, Ledger } from '@/lib/types';
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

export function useCreateLedger(type: Ledger['type'] = 'SHARED') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLedgerInput) =>
      type === 'PERSONAL'
        ? api.ledgers.createPersonal(input)
        : api.ledgers.create(input),
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
  const expenses = useExpenses(ledgerId, undefined, isGeneral);
  const incomes = useIncomes(ledgerId, undefined, isGeneral);

  return { ledger, plans, members, balance, expenses, incomes };
}
