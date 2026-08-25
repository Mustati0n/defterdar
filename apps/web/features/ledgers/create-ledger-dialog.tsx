'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { BookPlus, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '@/components/ui/toast';
import { useCreateLedger } from '@/features/data/hooks';
import { ApiError } from '@/lib/api-client';
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

export function CreateLedgerDialog({
  defaultOpen = false,
  defaultType = 'SHARED',
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: {
  defaultOpen?: boolean;
  defaultType?: Ledger['type'];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlledOpen ?? internalOpen;
  const [type, setType] = useState<Ledger['type']>(defaultType);
  const mutation = useCreateLedger(type);
  const toast = useToast();
  const router = useRouter();
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

  async function onSubmit(values: Values) {
    try {
      const ledger = await mutation.mutateAsync({
        ...values,
        description: values.description || null,
      });
      toast('Yeni defter masaya eklendi.');
      reset({ name: '', description: '', currency: 'TRY' });
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
              <fieldset className="field">
                <legend>Defter türü</legend>
                <div className="segmented-control">
                  <button
                    className={type === 'PERSONAL' ? 'is-active' : ''}
                    type="button"
                    aria-pressed={type === 'PERSONAL'}
                    onClick={() => setType('PERSONAL')}
                  >
                    Kişisel
                  </button>
                  <button
                    className={type === 'SHARED' ? 'is-active' : ''}
                    type="button"
                    aria-pressed={type === 'SHARED'}
                    onClick={() => setType('SHARED')}
                  >
                    Ortak
                  </button>
                </div>
                <small>
                  {type === 'PERSONAL'
                    ? 'Yalnız sana ait; hesabında en fazla bir tane olabilir.'
                    : 'Üyeler davet ederek birlikte hesap tutabilirsin.'}
                </small>
              </fieldset>
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
                  placeholder="Ev arkadaşları"
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
