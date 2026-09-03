'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { BookPlus, MailPlus, UserPlus, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '@/components/ui/toast';
import { useCreateLedger } from '@/features/data/hooks';
import { ApiError, api } from '@/lib/api-client';
import { useModalDialog } from '@/components/ui/use-modal-dialog';
import type { Ledger } from '@/lib/types';

const schema = z.object({
  name: z.string().trim().min(1, 'Deftere bir ad verin.').max(80),
  description: z.string().trim().max(500).optional(),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Üç harfli para birimi yazın.'),
});
type Values = z.infer<typeof schema>;

const emailSchema = z.string().trim().email('Geçerli bir e-posta yazın.');

export function CreateLedgerDialog({
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlledOpen ?? internalOpen;
  const mutation = useCreateLedger();
  const toast = useToast();
  const router = useRouter();
  const [invites, setInvites] = useState<string[]>([]);
  const [inviteDraft, setInviteDraft] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { currency: 'TRY' },
  });
  const dialogRef = useRef<HTMLElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const nameRegistration = register('name');
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };
  const handleDialogKeyDown = useModalDialog({
    open,
    onClose: () => setOpen(false),
    dialogRef,
    initialFocusRef: nameRef,
  });

  function addInvite() {
    const parsed = emailSchema.safeParse(inviteDraft);
    if (!parsed.success) {
      setInviteError(
        parsed.error.issues[0]?.message ?? 'Geçerli bir e-posta yazın.',
      );
      return;
    }
    const normalized = parsed.data.toLocaleLowerCase('tr-TR');
    if (invites.includes(normalized)) {
      setInviteError('Bu kişiyi zaten ekledin.');
      return;
    }
    setInvites((current) => [...current, normalized]);
    setInviteDraft('');
    setInviteError(null);
  }

  async function deliverInvites(ledger: Ledger): Promise<number> {
    const results = await Promise.all(
      invites.map(async (email) => {
        try {
          await api.ledgers.invite(ledger.id, email);
          return false;
        } catch {
          return true;
        }
      }),
    );
    return results.filter(Boolean).length;
  }

  async function onSubmit(values: Values) {
    try {
      const ledger = await mutation.mutateAsync({
        ...values,
        description: values.description || null,
      });
      const failed = await deliverInvites(ledger);
      if (failed === 0) {
        toast(
          invites.length
            ? 'Defter oluşturuldu; davetlerin hazır.'
            : 'Yeni defter masaya eklendi.',
        );
      } else {
        toast(
          `Defter oluşturuldu. ${failed} davet gönderilemedi. Tekrar deneyebilirsin.`,
          'error',
        );
      }
      reset({ name: '', description: '', currency: 'TRY' });
      setInvites([]);
      setOpen(false);
      router.push(`/ledgers/${ledger.id}`);
    } catch (error) {
      toast(
        error instanceof ApiError ? error.message : 'Defter oluşturulamadı.',
        'error',
      );
    }
  }

  return (
    <>
      {!hideTrigger ? (
        <button
          className="button button--primary"
          type="button"
          onClick={() => setOpen(true)}
        >
          <BookPlus /> Yeni Defter
        </button>
      ) : null}
      {open ? (
        <div
          className="dialog-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setOpen(false)
          }
        >
          <section
            ref={dialogRef}
            className="dialog-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-ledger-title"
            onKeyDown={handleDialogKeyDown}
          >
            <button
              className="dialog-card__close"
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Pencereyi kapat"
            >
              <X />
            </button>
            <span className="eyebrow">Yeni kapak</span>
            <h2 id="new-ledger-title">Bir defter açalım.</h2>
            <p>Para birimi defterin sabit dili olur; sonra değiştirilemez.</p>
            <form onSubmit={handleSubmit(onSubmit)} className="stack-form">
              <label className="field">
                <span>Defter adı</span>
                <input
                  id="ledger-name"
                  {...nameRegistration}
                  ref={(element) => {
                    nameRegistration.ref(element);
                    nameRef.current = element;
                  }}
                  className="input"
                  placeholder="Ev bütçesi"
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={
                    errors.name ? 'ledger-name-error' : undefined
                  }
                />
                {errors.name ? (
                  <small id="ledger-name-error">{errors.name.message}</small>
                ) : null}
              </label>
              <label className="field">
                <span>
                  Kapak notu <em>isteğe bağlı</em>
                </span>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Bu defter ne için?"
                  aria-invalid={Boolean(errors.description)}
                  aria-describedby={
                    errors.description ? 'ledger-description-error' : undefined
                  }
                  {...register('description')}
                />
                {errors.description ? (
                  <small id="ledger-description-error">
                    {errors.description.message}
                  </small>
                ) : null}
              </label>
              <label className="field field--short">
                <span>Para birimi</span>
                <input
                  className="input"
                  maxLength={3}
                  aria-invalid={Boolean(errors.currency)}
                  aria-describedby={
                    errors.currency ? 'ledger-currency-error' : undefined
                  }
                  {...register('currency')}
                />
                {errors.currency ? (
                  <small id="ledger-currency-error">
                    {errors.currency.message}
                  </small>
                ) : null}
              </label>
              <fieldset className="field">
                <legend>
                  Arkadaş ekle <em>isteğe bağlı</em>
                </legend>
                <div className="add-row">
                  <input
                    className="input"
                    type="email"
                    value={inviteDraft}
                    onChange={(event) => {
                      setInviteDraft(event.target.value);
                      setInviteError(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addInvite();
                      }
                    }}
                    placeholder="Birlikte tutacağın biri var mı?"
                    aria-label="Davet edilecek e-posta"
                    aria-invalid={Boolean(inviteError)}
                  />
                  <button
                    className="button button--quiet button--small"
                    type="button"
                    onClick={addInvite}
                  >
                    <UserPlus /> Ekle
                  </button>
                </div>
                {inviteError ? <small>{inviteError}</small> : null}
                {invites.length ? (
                  <div
                    className="invite-chip-list"
                    aria-label="Eklenecek kişiler"
                  >
                    {invites.map((email) => (
                      <span className="invite-chip" key={email}>
                        <MailPlus />
                        {email}
                        <button
                          type="button"
                          aria-label={`${email} davetini kaldır`}
                          onClick={() =>
                            setInvites((current) =>
                              current.filter((item) => item !== email),
                            )
                          }
                        >
                          <X />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
              </fieldset>
              <div className="dialog-card__actions">
                <button
                  className="button button--quiet"
                  type="button"
                  onClick={() => setOpen(false)}
                >
                  Vazgeç
                </button>
                <button
                  className="button button--primary"
                  disabled={mutation.isPending}
                  type="submit"
                >
                  {mutation.isPending ? 'Hazırlanıyor…' : 'Defteri aç'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
