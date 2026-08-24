'use client';

import dynamic from 'next/dynamic';
import { LoadingState } from '@/components/ui/states';

const ExpenseForm = dynamic(
  () =>
    import('@/features/expenses/expense-form').then(
      (module) => module.ExpenseForm,
    ),
  {
    ssr: false,
    loading: () => <LoadingState label="Harcama formu hazırlanıyor…" />,
  },
);

const IncomeForm = dynamic(
  () =>
    import('@/features/incomes/income-form').then(
      (module) => module.IncomeForm,
    ),
  {
    ssr: false,
    loading: () => <LoadingState label="Gelir formu hazırlanıyor…" />,
  },
);

export function LazyRouteForm({ kind }: { kind: 'expense' | 'income' }) {
  return kind === 'expense' ? <ExpenseForm /> : <IncomeForm />;
}
