import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Archive, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { queryKeys } from '@/features/data/hooks';
import { api, ApiError } from '@/lib/api-client';
import type { Ledger, Plan } from '@/lib/types';

export function PlanSettingsPanel({
  plan,
  ledgers,
  canEdit,
  canAdmin,
}: {
  plan: Plan;
  ledgers: Ledger[];
  canEdit: boolean;
  canAdmin: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description ?? '');
  const [startsAt, setStartsAt] = useState(plan.startsAt?.slice(0, 10) ?? '');
  const [endsAt, setEndsAt] = useState(plan.endsAt?.slice(0, 10) ?? '');
  const [targetLedgerId, setTargetLedgerId] = useState('');
  const [confirm, setConfirm] = useState<'archive' | 'move' | null>(null);
  const mutation = useMutation({
    mutationFn: (operation: () => Promise<unknown>) => operation(),
    onSuccess: async () => {
      setConfirm(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.plan(plan.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.plansRoot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.overview }),
      ]);
      toast('Plan güncellendi.');
    },
    onError: (error) =>
      toast(
        error instanceof ApiError ? error.message : 'Plan güncellenemedi.',
        'error',
      ),
  });
  const run = () => {
    if (confirm === 'archive')
      mutation.mutate(() =>
        plan.status === 'ARCHIVED'
          ? api.plans.unarchive(plan.id)
          : api.plans.archive(plan.id),
      );
    if (confirm === 'move' && targetLedgerId)
      mutation.mutate(async () => {
        const moved = await api.plans.move(plan.id, targetLedgerId);
        router.replace(`/plans/${moved.id}`);
      });
  };
  return (
    <section className="paper-section detail-full">
      <span className="eyebrow">Plan ayarları</span>
      <h2>Bilgiler ve yönetim</h2>
      <div className="stack-form settings-form">
        <label className="field">
          <span>Plan adı</span>
          <input
            className="input"
            disabled={!canEdit || plan.status !== 'ACTIVE'}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Açıklama</span>
          <textarea
            className="input"
            disabled={!canEdit || plan.status !== 'ACTIVE'}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Başlangıç</span>
            <input
              className="input"
              type="date"
              disabled={!canEdit || plan.status !== 'ACTIVE'}
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Bitiş</span>
            <input
              className="input"
              type="date"
              disabled={!canEdit || plan.status !== 'ACTIVE'}
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
            />
          </label>
        </div>
        {canEdit && plan.status === 'ACTIVE' ? (
          <button
            className="button button--primary"
            type="button"
            disabled={!name.trim() || mutation.isPending}
            onClick={() =>
              mutation.mutate(() =>
                api.plans.update(plan.id, {
                  name: name.trim(),
                  description: description.trim() || null,
                  startsAt: startsAt
                    ? new Date(`${startsAt}T00:00:00`).toISOString()
                    : null,
                  endsAt: endsAt
                    ? new Date(`${endsAt}T23:59:59`).toISOString()
                    : null,
                }),
              )
            }
          >
            Değişiklikleri kaydet
          </button>
        ) : null}
      </div>
      <div className="danger-zone">
        <h3>Plan durumu</h3>
        {canAdmin ? (
          <button
            className="button button--quiet"
            type="button"
            onClick={() => setConfirm('archive')}
          >
            {plan.status === 'ARCHIVED' ? <RefreshCw /> : <Archive />}
            {plan.status === 'ARCHIVED' ? 'Arşivden çıkar' : 'Planı arşivle'}
          </button>
        ) : null}
        {canAdmin && plan.status === 'ACTIVE' ? (
          <div className="transfer-row">
            <select
              className="input"
              value={targetLedgerId}
              onChange={(event) => setTargetLedgerId(event.target.value)}
            >
              <option value="">Hedef Defter seç</option>
              {ledgers
                .filter(
                  (ledger) => ledger.id !== plan.ledgerId && !ledger.archivedAt,
                )
                .map((ledger) => (
                  <option value={ledger.id} key={ledger.id}>
                    {ledger.name}
                  </option>
                ))}
            </select>
            <button
              className="button button--danger"
              type="button"
              disabled={!targetLedgerId}
              onClick={() => setConfirm('move')}
            >
              Planı taşı
            </button>
          </div>
        ) : null}
      </div>
      <ConfirmationDialog
        open={Boolean(confirm)}
        title={
          confirm === 'move'
            ? 'Planı başka Deftere taşı?'
            : confirm === 'archive'
              ? 'Planın arşiv durumunu değiştir?'
              : 'Plan durumunu değiştir?'
        }
        description={
          confirm === 'move'
            ? 'Tüm katılımcıların hedef Defterde üye olması gerekir.'
            : 'Bu işlem yeni harcama ekleme davranışını değiştirebilir.'
        }
        confirmLabel="Onayla"
        danger={confirm === 'archive' || confirm === 'move'}
        pending={mutation.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={run}
      />
    </section>
  );
}
