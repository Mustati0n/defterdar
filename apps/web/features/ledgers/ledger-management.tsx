'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  Copy,
  LogOut,
  MailPlus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
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

export function LedgerMembersPanel({
  ledger,
  members,
}: {
  ledger: Ledger;
  members: LedgerMember[];
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [removeMember, setRemoveMember] = useState<LedgerMember | null>(null);
  const invitations = useQuery({
    queryKey: queryKeys.invitations(ledger.id),
    queryFn: () => api.ledgers.invitations(ledger.id),
    enabled: ledger.role !== 'MEMBER',
  });
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.members(ledger.id) }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.invitations(ledger.id),
      }),
      queryClient.invalidateQueries({ queryKey: queryKeys.ledger(ledger.id) }),
      queryClient.invalidateQueries({ queryKey: ['ledgers'] }),
    ]);
  };
  const mutate = useMutation({
    mutationFn: async (operation: () => Promise<unknown>) => operation(),
    onSuccess: refresh,
    onError: (error) => toast(message(error), 'error'),
  });

  async function createInvite() {
    try {
      const result = await api.ledgers.invite(
        ledger.id,
        email.trim() || undefined,
      );
      const link = `${window.location.origin}/invitations/${result.token}`;
      setInviteLink(link);
      setEmail('');
      await queryClient.invalidateQueries({
        queryKey: queryKeys.invitations(ledger.id),
      });
      toast('Davet bağlantısı hazır.');
    } catch (error) {
      toast(message(error), 'error');
    }
  }

  return (
    <section className="paper-section detail-full">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Defter çevresi</span>
          <h2>Üyeler ve roller</h2>
        </div>
        <span className="status-chip">{members.length} aktif üye</span>
      </div>
      {ledger.role !== 'MEMBER' ? (
        <div className="invite-box">
          <label className="field">
            <span>
              E-posta ile sınırla <em>isteğe bağlı</em>
            </span>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="arkadas@example.com"
            />
          </label>
          <button
            className="button button--primary"
            type="button"
            onClick={() => void createInvite()}
          >
            <MailPlus /> Davet oluştur
          </button>
          {inviteLink ? (
            <div className="copy-row">
              <input
                className="input"
                readOnly
                value={inviteLink}
                aria-label="Davet bağlantısı"
              />
              <button
                className="button button--quiet"
                type="button"
                onClick={() =>
                  void navigator.clipboard
                    .writeText(inviteLink)
                    .then(() => toast('Bağlantı kopyalandı.'))
                }
              >
                <Copy /> Kopyala
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="people-list">
        {members.map((member) => (
          <article key={member.user.id}>
            <span className="avatar avatar--paper">
              {member.user.displayName[0]}
            </span>
            <div>
              <strong>{member.user.displayName}</strong>
              <small>{member.role}</small>
            </div>
            {ledger.role === 'OWNER' && member.role !== 'OWNER' ? (
              <div className="row-actions">
                <select
                  className="input"
                  aria-label={`${member.user.displayName} rolü`}
                  value={member.role}
                  disabled={mutate.isPending}
                  onChange={(event) =>
                    mutate.mutate(() =>
                      api.ledgers.updateMemberRole(
                        ledger.id,
                        member.user.id,
                        event.target.value as 'ADMIN' | 'MEMBER',
                      ),
                    )
                  }
                >
                  <option value="ADMIN">Yönetici</option>
                  <option value="MEMBER">Üye</option>
                </select>
                <button
                  className="icon-button"
                  type="button"
                  aria-label={`${member.user.displayName} üyesini çıkar`}
                  onClick={() => setRemoveMember(member)}
                >
                  <Trash2 />
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
      {ledger.role !== 'MEMBER' && invitations.data?.length ? (
        <div className="subsection">
          <h3>Bekleyen davetler</h3>
          {invitations.data
            .filter((invite) => !invite.acceptedAt && !invite.revokedAt)
            .map((invite) => (
              <div className="list-row" key={invite.id}>
                <span>
                  {invite.invitedEmail || 'Bağlantıya sahip kişi'}
                  <small>
                    {new Date(invite.expiresAt).toLocaleString('tr-TR')}{' '}
                    tarihine kadar
                  </small>
                </span>
                <button
                  className="button button--quiet button--small"
                  type="button"
                  onClick={() =>
                    mutate.mutate(() =>
                      api.ledgers.revokeInvitation(ledger.id, invite.id),
                    )
                  }
                >
                  İptal et
                </button>
              </div>
            ))}
        </div>
      ) : null}
      <ConfirmationDialog
        open={Boolean(removeMember)}
        title="Üye Defterden çıkarılsın mı?"
        description={`${removeMember?.user.displayName ?? 'Bu üye'} Deftere erişimini kaybedecek.`}
        confirmLabel="Üyeyi çıkar"
        danger
        pending={mutate.isPending}
        onCancel={() => setRemoveMember(null)}
        onConfirm={() =>
          removeMember &&
          mutate.mutate(
            () => api.ledgers.removeMember(ledger.id, removeMember.user.id),
            { onSuccess: () => setRemoveMember(null) },
          )
        }
      />
    </section>
  );
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
        queryClient.invalidateQueries({ queryKey: ['ledgers'] }),
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
        router.push('/ledgers');
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
