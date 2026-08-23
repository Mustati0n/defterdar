'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { BookPlus, X } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '@/components/ui/toast';
import { useCreateLedger } from '@/features/data/hooks';
import { ApiError } from '@/lib/api-client';

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
}: {
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const mutation = useCreateLedger();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { currency: 'TRY' },
  });

  async function onSubmit(values: Values) {
    try {
      await mutation.mutateAsync({
        ...values,
        description: values.description || null,
      });
      toast('Yeni defter masaya eklendi.');
      reset({ name: '', description: '', currency: 'TRY' });
      setOpen(false);
    } catch (error) {
      toast(
        error instanceof ApiError ? error.message : 'Defter oluşturulamadı.',
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
      >
        <BookPlus /> Yeni Defter
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
            className="dialog-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-ledger-title"
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
                  className="input"
                  autoFocus
                  placeholder="Ev arkadaşları"
                  {...register('name')}
                />
                {errors.name ? <small>{errors.name.message}</small> : null}
              </label>
              <label className="field">
                <span>
                  Kapak notu <em>isteğe bağlı</em>
                </span>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Bu defter ne için?"
                  {...register('description')}
                />
                {errors.description ? (
                  <small>{errors.description.message}</small>
                ) : null}
              </label>
              <label className="field field--short">
                <span>Para birimi</span>
                <input
                  className="input"
                  maxLength={3}
                  {...register('currency')}
                />
                {errors.currency ? (
                  <small>{errors.currency.message}</small>
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
