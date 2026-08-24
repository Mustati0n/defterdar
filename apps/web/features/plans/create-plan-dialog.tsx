'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarPlus, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '@/components/ui/toast';
import { useCreatePlan } from '@/features/data/hooks';
import { ApiError } from '@/lib/api-client';
import type { Ledger } from '@/lib/types';
import { useModalDialog } from '@/components/ui/use-modal-dialog';

const schema = z
  .object({
    ledgerId: z.string().min(1, 'Bir defter seçin.'),
    name: z.string().trim().min(1, 'Plana bir ad verin.').max(100),
    description: z.string().trim().max(1000).optional(),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
  })
  .refine(
    (values) =>
      !values.startsAt || !values.endsAt || values.endsAt >= values.startsAt,
    {
      message: 'Bitiş tarihi başlangıçtan önce olamaz.',
      path: ['endsAt'],
    },
  );
type Values = z.infer<typeof schema>;

export function CreatePlanDialog({
  ledgers,
  defaultOpen = false,
  initialLedgerId = '',
}: {
  ledgers: Ledger[];
  defaultOpen?: boolean;
  initialLedgerId?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const mutation = useCreatePlan();
  const toast = useToast();
  const router = useRouter();
  const activeLedgers = ledgers.filter((ledger) => !ledger.archivedAt);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { ledgerId: initialLedgerId },
  });
  const dialogRef = useRef<HTMLElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const nameRegistration = register('name');
  const handleDialogKeyDown = useModalDialog({
    open,
    onClose: () => setOpen(false),
    dialogRef,
    initialFocusRef: nameRef,
  });

  async function onSubmit(values: Values) {
    try {
      const plan = await mutation.mutateAsync({
        ledgerId: values.ledgerId,
        input: {
          name: values.name,
          description: values.description || null,
          startsAt: values.startsAt
            ? new Date(`${values.startsAt}T00:00:00`).toISOString()
            : null,
          endsAt: values.endsAt
            ? new Date(`${values.endsAt}T23:59:59`).toISOString()
            : null,
        },
      });
      toast('Yeni plan deftere iliştirildi.');
      reset();
      setOpen(false);
      router.push(`/plans/${plan.id}`);
    } catch (error) {
      toast(
        error instanceof ApiError ? error.message : 'Plan oluşturulamadı.',
        'error',
      );
    }
  }

  return (
    <>
      <button
        className="button button--primary"
        type="button"
        onClick={() => setOpen(true)}
        disabled={!activeLedgers.length}
      >
        <CalendarPlus /> Yeni Plan
      </button>
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
            aria-labelledby="new-plan-title"
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
            <span className="eyebrow">Yeni iliştirilmiş not</span>
            <h2 id="new-plan-title">Sıradaki plan ne?</h2>
            <p>Planı bir deftere bağla; tarihleri istersen sonra netleştir.</p>
            <form onSubmit={handleSubmit(onSubmit)} className="stack-form">
              <label className="field">
                <span>Bağlı defter</span>
                {initialLedgerId ? (
                  <input type="hidden" {...register('ledgerId')} />
                ) : (
                  <select
                    className="input"
                    aria-invalid={Boolean(errors.ledgerId)}
                    aria-describedby={
                      errors.ledgerId ? 'plan-ledger-error' : undefined
                    }
                    {...register('ledgerId')}
                  >
                    <option value="" disabled>
                      Defter seç
                    </option>
                    {activeLedgers.map((ledger) => (
                      <option value={ledger.id} key={ledger.id}>
                        {ledger.name}
                      </option>
                    ))}
                  </select>
                )}
                {initialLedgerId ? (
                  <div className="context-note">
                    {activeLedgers.find(
                      (ledger) => ledger.id === initialLedgerId,
                    )?.name ?? 'Seçili Defter'}{' '}
                    içinde oluşturulacak.
                  </div>
                ) : null}
                {errors.ledgerId ? (
                  <small id="plan-ledger-error">{errors.ledgerId.message}</small>
                ) : null}
              </label>
              <label className="field">
                <span>Plan adı</span>
                <input
                  {...nameRegistration}
                  ref={(element) => {
                    nameRegistration.ref(element);
                    nameRef.current = element;
                  }}
                  className="input"
                  placeholder="Ege hafta sonu"
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? 'plan-name-error' : undefined}
                />
                {errors.name ? (
                  <small id="plan-name-error">{errors.name.message}</small>
                ) : null}
              </label>
              <label className="field">
                <span>
                  Kısa not <em>isteğe bağlı</em>
                </span>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Kim, ne zaman, neden?"
                  {...register('description')}
                />
              </label>
              <div className="field-row">
                <label className="field">
                  <span>Başlangıç</span>
                  <input
                    className="input"
                    type="date"
                    {...register('startsAt')}
                  />
                </label>
                <label className="field">
                  <span>Bitiş</span>
                  <input
                    className="input"
                    type="date"
                    aria-invalid={Boolean(errors.endsAt)}
                    aria-describedby={
                      errors.endsAt ? 'plan-ends-at-error' : undefined
                    }
                    {...register('endsAt')}
                  />
                  {errors.endsAt ? (
                    <small id="plan-ends-at-error">
                      {errors.endsAt.message}
                    </small>
                  ) : null}
                </label>
              </div>
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
                  {mutation.isPending ? 'İliştiriliyor…' : 'Planı ekle'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
