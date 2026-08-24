'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Archive, CheckCircle2, RefreshCw, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { queryKeys } from '@/features/data/hooks';
import { api, ApiError } from '@/lib/api-client';
import type { Ledger, LedgerMember, Plan, PlanParticipant } from '@/lib/types';

export function PlanParticipantsPanel({
  plan,
  participants,
  members,
  canManage,
}: {
  plan: Plan;
  participants: PlanParticipant[];
  members: LedgerMember[];
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [userId, setUserId] = useState('');
  const [removeParticipant, setRemoveParticipant] =
    useState<PlanParticipant | null>(null);
  const mutation = useMutation({
    mutationFn: (operation: () => Promise<unknown>) => operation(),
    onSuccess: async () => {
      setUserId('');
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.participants(plan.id),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.plan(plan.id) }),
        queryClient.invalidateQueries({ queryKey: ['plans', plan.ledgerId] }),
      ]);
    },
    onError: (error) =>
      toast(
        error instanceof ApiError ? error.message : 'Katılımcı güncellenemedi.',
        'error',
      ),
  });
  const available = members.filter(
    (member) =>
      !participants.some(
        (participant) => participant.user.id === member.user.id,
      ),
  );
  return (
    <section className="paper-section detail-full">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Bu plandaki insanlar</span>
          <h2>Katılımcılar</h2>
        </div>
        <span className="status-chip">{participants.length} kişi</span>
      </div>
      {canManage && plan.status === 'ACTIVE' ? (
        <div className="add-row">
          <select
            className="input"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
          >
            <option value="">Defter üyesi seç</option>
            {available.map((member) => (
              <option value={member.user.id} key={member.user.id}>
                {member.user.displayName}
              </option>
            ))}
          </select>
          <button
            className="button button--primary"
            type="button"
            disabled={!userId || mutation.isPending}
            onClick={() =>
              mutation.mutate(() => api.plans.addParticipant(plan.id, userId))
            }
          >
            Katılımcı ekle
          </button>
        </div>
      ) : null}
      <div className="people-list">
        {participants.map((participant) => (
          <article key={participant.user.id}>
            <span className="avatar avatar--paper">
              {participant.user.displayName[0]}
            </span>
            <div>
              <strong>{participant.user.displayName}</strong>
              <small>Katılımcı</small>
            </div>
            {canManage && plan.status === 'ACTIVE' ? (
              <button
                className="icon-button"
                type="button"
                aria-label={`${participant.user.displayName} katılımcısını çıkar`}
                onClick={() => setRemoveParticipant(participant)}
              >
                <Trash2 />
              </button>
            ) : null}
          </article>
        ))}
      </div>
      <ConfirmationDialog
        open={Boolean(removeParticipant)}
        title="Katılımcı Plandan çıkarılsın mı?"
        description={`${removeParticipant?.user.displayName ?? 'Bu kişi'} yeni Plan harcamalarına eklenemeyecek.`}
        confirmLabel="Katılımcıyı çıkar"
        danger
        pending={mutation.isPending}
        onCancel={() => setRemoveParticipant(null)}
        onConfirm={() =>
          removeParticipant &&
          mutation.mutate(
            () =>
              api.plans.removeParticipant(plan.id, removeParticipant.user.id),
            { onSuccess: () => setRemoveParticipant(null) },
          )
        }
      />
    </section>
  );
}

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
        queryClient.invalidateQueries({ queryKey: ['plans'] }),
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
        queryClient.invalidateQueries({ queryKey: ['plans'] }),
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
