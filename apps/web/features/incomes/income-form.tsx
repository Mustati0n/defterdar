'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, CircleDollarSign } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '@/components/ui/toast';
import {
  useCreateIncome,
  useLedgers,
  usePlan,
  usePlans,
} from '@/features/data/hooks';
import { ApiError } from '@/lib/api-client';

const schema = z
  .object({
    ledgerId: z.string(),
    planId: z.string().optional(),
    title: z.string().trim().min(1, 'Gelire kısa bir ad ver.').max(160),
    amount: z
      .string()
      .refine(
        (value) => Number(value.replace(',', '.')) > 0,
        'Sıfırdan büyük bir tutar yaz.',
      ),
    incomeDate: z.string().min(1, 'Tarih seç.'),
    description: z.string().trim().max(1000).optional(),
  })
  .superRefine((value, context) => {
    if (!value.ledgerId && !value.planId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ledgerId'],
        message: 'Bir Defter veya Plan seç.',
      });
    }
  });
type Values = z.infer<typeof schema>;

export function IncomeForm({
  initialLedgerId,
  initialPlanId,
  onCancel,
  onComplete,
  presentation = 'page',
}: {
  initialLedgerId?: string;
  initialPlanId?: string;
  onCancel?: () => void;
  onComplete?: () => void;
  presentation?: 'page' | 'dialog';
} = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ledgers = useLedgers();
  const createIncome = useCreateIncome();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const requestedPlanId = initialPlanId ?? searchParams.get('planId') ?? '';
  const requestedPlan = usePlan(requestedPlanId);
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      ledgerId: initialLedgerId ?? searchParams.get('ledgerId') ?? '',
      planId: requestedPlanId,
      title: '',
      amount: '',
      description: '',
      incomeDate: new Date().toISOString().slice(0, 10),
    },
  });
  const ledgerId = useWatch({ control, name: 'ledgerId' });
  const selectedLedger = ledgers.data?.find((ledger) => ledger.id === ledgerId);
  const standalonePlan = requestedPlan.data?.scope === 'STANDALONE';
  const selectedCurrency =
    selectedLedger?.currency ?? requestedPlan.data?.currency;
  const plans = usePlans(ledgerId, false, Boolean(ledgerId));

  useEffect(() => {
    if (!ledgerId && !requestedPlanId && ledgers.data?.length) {
      const defaultLedger =
        ledgers.data.find((ledger) => ledger.type === 'PERSONAL') ??
        ledgers.data[0];
      if (defaultLedger) setValue('ledgerId', defaultLedger.id);
    }
  }, [ledgerId, ledgers.data, requestedPlanId, setValue]);

  useEffect(() => {
    if (requestedPlan.data?.ledgerId && !ledgerId) {
      setValue('ledgerId', requestedPlan.data.ledgerId);
    }
  }, [ledgerId, requestedPlan.data?.ledgerId, setValue]);

  async function onSubmit(values: Values) {
    setFormError(null);
    try {
      await createIncome.mutateAsync({
        ledgerId: values.ledgerId || null,
        input: {
          title: values.title,
          description: values.description || null,
          amountMinor: Math.round(
            Number(values.amount.replace(',', '.')) * 100,
          ),
          planId: values.planId || null,
          incomeDate: new Date(`${values.incomeDate}T12:00:00`).toISOString(),
        },
      });
      toast(standalonePlan ? 'Gelir Plana eklendi.' : 'Gelir Deftere eklendi.');
      onComplete?.();
      router.push(
        values.planId
          ? `/plans/${values.planId}`
          : `/ledgers/${values.ledgerId}`,
      );
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : 'Gelir eklenemedi. Tekrar dene.',
      );
    }
  }

  return (
    <form
      className={`income-form paper-section${presentation === 'dialog' ? ' income-form--dialog' : ''}`}
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <div className="form-question">
        <span>1</span>
        <div>
          <small>Ne geldi?</small>
          <h2>Gelirin kısa adı</h2>
        </div>
      </div>
      <label className="field">
        <span>Gelir</span>
        <input
          className="input input--large"
          autoFocus
          placeholder="Örn. Maaş, iade, satış"
          {...register('title')}
        />
        {errors.title ? <small>{errors.title.message}</small> : null}
      </label>
      <div className="form-question">
        <span>2</span>
        <div>
          <small>Ne kadar?</small>
          <h2>Gelen tutar</h2>
        </div>
      </div>
      <div className="amount-input">
        <input
          inputMode="decimal"
          placeholder="0,00"
          aria-label="Gelir tutarı"
          {...register('amount')}
        />
        <strong>{selectedCurrency ?? 'TRY'}</strong>
      </div>
      {errors.amount ? (
        <p className="field-error">{errors.amount.message}</p>
      ) : null}
      <div className="field-row">
        <label className="field">
          <span>{standalonePlan ? 'Plan' : 'Defter'}</span>
          {standalonePlan ? (
            <>
              <input type="hidden" {...register('ledgerId')} />
              <div className="context-note">
                {requestedPlan.data?.name ?? 'Seçili bağımsız Plan'}
              </div>
            </>
          ) : (
            <select className="input" {...register('ledgerId')}>
              <option value="">Defter seç</option>
              {ledgers.data
                ?.filter((ledger) => !ledger.archivedAt)
                .map((ledger) => (
                  <option value={ledger.id} key={ledger.id}>
                    {ledger.name}
                  </option>
                ))}
            </select>
          )}
        </label>
        {!requestedPlanId ? (
          <label className="field">
            <span>
              Plan <em>isteğe bağlı</em>
            </span>
            <select className="input" {...register('planId')}>
              <option value="">Bir Plana bağlı değil</option>
              {plans.data
                ?.filter((plan) => plan.status === 'ACTIVE')
                .map((plan) => (
                  <option value={plan.id} key={plan.id}>
                    {plan.name}
                  </option>
                ))}
            </select>
          </label>
        ) : (
          <input type="hidden" {...register('planId')} />
        )}
      </div>
      <label className="field field--date">
        <span>Gelir tarihi</span>
        <input className="input" type="date" {...register('incomeDate')} />
      </label>
      <label className="field">
        <span>
          Not <em>isteğe bağlı</em>
        </span>
        <textarea
          className="input"
          rows={3}
          placeholder="Bu geliri sonra nasıl hatırlamak istersin?"
          {...register('description')}
        />
      </label>
      <div className="plain-language-note">
        <CircleDollarSign />
        <p>
          <strong>Gelir, nakit akışını gösterir.</strong> Kişiler arasında borç
          veya alacak oluşturmaz.
        </p>
      </div>
      {formError ? (
        <div className="form-error" role="alert">
          {formError}
        </div>
      ) : null}
      <div className="quick-form-actions">
        {onCancel ? (
          <button
            className="button button--quiet"
            type="button"
            onClick={onCancel}
          >
            Vazgeç
          </button>
        ) : null}
        <button
          className="button button--primary button--tall"
          type="submit"
          disabled={createIncome.isPending}
        >
          <CircleDollarSign />{' '}
          {createIncome.isPending ? 'Kaydediliyor…' : 'Geliri ekle'}{' '}
          <ArrowRight />
        </button>
      </div>
    </form>
  );
}
