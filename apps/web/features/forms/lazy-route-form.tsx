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

export function LazyRouteForm({
  kind,
  initialLedgerId,
  initialPlanId,
  onCancel,
  onComplete,
  presentation = 'page',
}: {
  kind: 'expense' | 'income';
  initialLedgerId?: string;
  initialPlanId?: string;
  onCancel?: () => void;
  onComplete?: () => void;
  presentation?: 'page' | 'wizard' | 'dialog';
}) {
  return kind === 'expense' ? (
    <ExpenseForm
      initialLedgerId={initialLedgerId}
      initialPlanId={initialPlanId}
      onCancel={onCancel}
      onComplete={onComplete}
      presentation={presentation}
    />
  ) : (
    <IncomeForm
      initialLedgerId={initialLedgerId}
      initialPlanId={initialPlanId}
      onCancel={onCancel}
      onComplete={onComplete}
      presentation={presentation === 'dialog' ? 'dialog' : 'page'}
    />
  );
}
