import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { queryKeys } from '@/features/data/hooks';
import { api, ApiError } from '@/lib/api-client';
import type { Plan } from '@/lib/types';

export function PlanLifecycleAction({
  plan,
  canEdit,
}: {
  plan: Plan;
  canEdit: boolean;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const mutation = useMutation({
    mutationFn: () =>
      plan.status === 'COMPLETED'
        ? api.plans.reopen(plan.id)
        : api.plans.complete(plan.id),
    onSuccess: async () => {
      setConfirmOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.plan(plan.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.plansRoot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.overview }),
      ]);
      toast(
        plan.status === 'COMPLETED'
          ? 'Plan yeniden açıldı.'
          : 'Plan tamamlandı.',
      );
    },
    onError: (error) =>
      toast(
        error instanceof ApiError ? error.message : 'Plan güncellenemedi.',
        'error',
      ),
  });

  if (!canEdit || plan.status === 'ARCHIVED') return null;

  const reopening = plan.status === 'COMPLETED';
  return (
    <>
      <button
        className="button button--quiet"
        type="button"
        onClick={() => setConfirmOpen(true)}
      >
        {reopening ? <RefreshCw /> : <CheckCircle2 />}
        {reopening ? 'Planı yeniden aç' : 'Planı tamamla'}
      </button>
      <ConfirmationDialog
        open={confirmOpen}
        title={reopening ? 'Plan yeniden açılsın mı?' : 'Plan tamamlansın mı?'}
        description={
          reopening
            ? 'Plan yeniden harcama ve katılımcı güncellemelerine açılacak.'
            : 'Yeni harcama eklenemeyecek; mevcut hesap okunmaya devam edecek.'
        }
        confirmLabel={reopening ? 'Yeniden aç' : 'Planı tamamla'}
        pending={mutation.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => mutation.mutate()}
      />
    </>
  );
}
