import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Archive, LogOut, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { queryKeys } from '@/features/data/hooks';
import { api, ApiError } from '@/lib/api-client';
import type { Ledger, LedgerMember } from '@/lib/types';

function message(error: unknown) {
  return error instanceof ApiError ? error.message : 'İşlem tamamlanamadı.';
}

export function LedgerSettingsPanel({
  ledger,
  members,
}: {
  ledger: Ledger;
  members: LedgerMember[];
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState(ledger.name);
  const [description, setDescription] = useState(ledger.description ?? '');
  const [targetOwner, setTargetOwner] = useState('');
  const [confirm, setConfirm] = useState<
    'archive' | 'leave' | 'transfer' | null
  >(null);
  const mutation = useMutation({
    mutationFn: async (operation: () => Promise<unknown>) => operation(),
    onSuccess: async () => {
      setConfirm(null);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.ledger(ledger.id),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.ledgersRoot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.overview }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.members(ledger.id),
        }),
      ]);
      toast('Defter güncellendi.');
    },
    onError: (error) => toast(message(error), 'error'),
  });
  const canEdit = ledger.role === 'OWNER' || ledger.role === 'ADMIN';
  const runConfirmed = () => {
    if (confirm === 'archive')
      mutation.mutate(() =>
        ledger.archivedAt
          ? api.ledgers.unarchive(ledger.id)
          : api.ledgers.archive(ledger.id),
      );
    if (confirm === 'leave')
      mutation.mutate(async () => {
        await api.ledgers.leave(ledger.id);
        router.push('/workspace?type=ledger');
      });
    if (confirm === 'transfer' && targetOwner)
      mutation.mutate(() =>
        api.ledgers.transferOwnership(ledger.id, targetOwner),
      );
  };
  return (
    <section className="paper-section detail-full">
      <span className="eyebrow">Defter ayarları</span>
      <h2>Kapak ve erişim</h2>
      <div className="stack-form settings-form">
        <label className="field">
          <span>Defter adı</span>
          <input
            className="input"
            value={name}
            disabled={!canEdit || Boolean(ledger.archivedAt)}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Açıklama</span>
          <textarea
            className="input"
            rows={3}
            value={description}
            disabled={!canEdit || Boolean(ledger.archivedAt)}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <label className="field field--short">
          <span>Para birimi</span>
          <input className="input" value={ledger.currency} disabled />
          <small>Defter oluşturulduktan sonra değiştirilemez.</small>
        </label>
        {canEdit && !ledger.archivedAt ? (
          <button
            className="button button--primary"
            type="button"
            disabled={mutation.isPending || !name.trim()}
            onClick={() =>
              mutation.mutate(() =>
                api.ledgers.update(ledger.id, {
                  name: name.trim(),
                  description: description.trim() || null,
                }),
              )
            }
          >
            Değişiklikleri kaydet
          </button>
        ) : !canEdit ? (
          <p className="muted-copy">
            Bu ayarları yalnızca Defter sahibi veya yöneticisi değiştirebilir.
          </p>
        ) : (
          <p className="muted-copy">
            Arşivdeki Defter değiştirilemez; önce yeniden aç.
          </p>
        )}
      </div>
      {ledger.type === 'SHARED' || ledger.role !== 'OWNER' ? (
        <div className="danger-zone">
          <h3>Üyelik ve yaşam döngüsü</h3>
          {ledger.role === 'OWNER' && ledger.type !== 'PERSONAL' ? (
            <button
              className="button button--quiet"
              type="button"
              onClick={() => setConfirm('archive')}
            >
              {ledger.archivedAt ? <RefreshCw /> : <Archive />}
              {ledger.archivedAt ? 'Defteri yeniden aç' : 'Defteri arşivle'}
            </button>
          ) : null}
          {ledger.role !== 'OWNER' ? (
            <button
              className="button button--danger"
              type="button"
              onClick={() => setConfirm('leave')}
            >
              <LogOut /> Defterden ayrıl
            </button>
          ) : null}
          {ledger.role === 'OWNER' && ledger.type !== 'PERSONAL' ? (
            <div className="transfer-row">
              <select
                className="input"
                value={targetOwner}
                onChange={(event) => setTargetOwner(event.target.value)}
              >
                <option value="">Yeni sahip seç</option>
                {members
                  .filter((member) => member.role !== 'OWNER')
                  .map((member) => (
                    <option value={member.user.id} key={member.user.id}>
                      {member.user.displayName}
                    </option>
                  ))}
              </select>
              <button
                className="button button--danger"
                type="button"
                disabled={!targetOwner}
                onClick={() => setConfirm('transfer')}
              >
                Sahipliği aktar
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
      <ConfirmationDialog
        open={Boolean(confirm)}
        title={
          confirm === 'leave'
            ? 'Defterden ayrıl?'
            : confirm === 'transfer'
              ? 'Sahipliği aktar?'
              : ledger.archivedAt
                ? 'Defteri yeniden aç?'
                : 'Defteri arşivle?'
        }
        description={
          confirm === 'transfer'
            ? 'Bu işlemden sonra Defter sahibi rolün sona erecek.'
            : 'Bu işlem Defterin erişim ve yeni kayıt davranışını değiştirecek.'
        }
        confirmLabel="Onayla"
        danger={confirm !== 'archive' || !ledger.archivedAt}
        pending={mutation.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={runConfirmed}
      />
    </section>
  );
}
