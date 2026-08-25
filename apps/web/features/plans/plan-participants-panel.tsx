import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { queryKeys } from '@/features/data/hooks';
import { api, ApiError } from '@/lib/api-client';
import type { LedgerMember, Plan, PlanParticipant } from '@/lib/types';

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
  const [email, setEmail] = useState('');
  const invitations = useQuery({
    queryKey: queryKeys.planInvitations(plan.id),
    queryFn: ({ signal }) => api.plans.invitations(plan.id, signal),
    enabled: plan.scope === 'STANDALONE' && canManage,
  });
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
        ...(plan.ledgerId
          ? [
              queryClient.invalidateQueries({
                queryKey: queryKeys.plansPrefix(plan.ledgerId),
              }),
            ]
          : []),
        queryClient.invalidateQueries({
          queryKey: queryKeys.planInvitations(plan.id),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.overview }),
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
        plan.scope === 'STANDALONE' ? (
          <div className="add-row">
            <input
              className="input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="katilimci@example.com"
              aria-label="Davet e-postası"
            />
            <button
              className="button button--primary"
              type="button"
              disabled={!email.trim() || mutation.isPending}
              onClick={() =>
                mutation.mutate(async () => {
                  const created = await api.plans.invite(plan.id, email.trim());
                  const link = `${window.location.origin}/plan-invitations/${created.token}`;
                  await navigator.clipboard.writeText(link);
                  setEmail('');
                  toast('Davet bağlantısı panoya kopyalandı.');
                })
              }
            >
              <Copy /> Davet oluştur
            </button>
          </div>
        ) : (
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
        )
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
      {plan.scope === 'STANDALONE' && invitations.data?.length ? (
        <div className="invitation-list">
          {invitations.data
            .filter(
              (invitation) => !invitation.acceptedAt && !invitation.revokedAt,
            )
            .map((invitation) => (
              <article key={invitation.id}>
                <span>{invitation.invitedEmail}</span>
                <button
                  className="button button--quiet button--small"
                  type="button"
                  onClick={() =>
                    mutation.mutate(() =>
                      api.plans.revokeInvitation(plan.id, invitation.id),
                    )
                  }
                >
                  Daveti iptal et
                </button>
              </article>
            ))}
        </div>
      ) : null}
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
