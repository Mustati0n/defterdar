'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, CircleHelp, Gift, ReceiptText } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '@/components/ui/toast';
import {
  queryKeys,
  useCreateExpense,
  useLedgers,
  usePlans,
} from '@/features/data/hooks';
import { useAuth } from '@/features/auth/auth-provider';
import { api, ApiError } from '@/lib/api-client';
import type { SplitMethod } from '@/lib/types';
import { useCategories } from '@/features/data/hooks';
import { parseMoneyToMinor, equalPreview } from '@/lib/money';
import { buildSplit } from './split-payload';
import { formatMoneyFromMinor } from '@/lib/format';
import { invalidateFinancialData } from '@/features/data/financial-invalidation';

const schema = z.object({
  ledgerId: z.string().min(1, 'Bir Defter seç.'),
  planId: z.string().optional(),
  title: z.string().trim().min(1, 'Harcamaya kısa bir ad ver.').max(160),
  amount: z
    .string()
    .refine(
      (value) => (parseMoneyToMinor(value) ?? 0) > 0,
      'Sıfırdan büyük bir tutar yaz.',
    ),
  payerUserId: z.string().min(1, 'Kimin ödediğini seç.'),
  participantUserIds: z.array(z.string()).min(1, 'En az bir kişi seç.'),
  splitMethod: z.enum(['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES']),
  expenseDate: z.string().min(1, 'Tarih seç.'),
  description: z.string().trim().max(1000).optional(),
  categoryId: z.string().optional(),
  isGift: z.boolean(),
});
type Values = z.infer<typeof schema>;

const splitOptions: Array<{
  value: SplitMethod;
  label: string;
  help: string;
}> = [
  {
    value: 'EQUAL',
    label: 'Eşit böl',
    help: 'Tutarı seçilen kişilere eşit dağıt',
  },
  { value: 'EXACT', label: 'Tutar gir', help: 'Herkesin payını ayrı yaz' },
  {
    value: 'PERCENTAGE',
    label: 'Yüzdeyle böl',
    help: 'Payları yüzde olarak belirle',
  },
  {
    value: 'SHARES',
    label: 'Pay oranı',
    help: '1 pay, 2 pay gibi oranla dağıt',
  },
];

export function ExpenseForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const ledgers = useLedgers();
  const createExpense = useCreateExpense();
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const lastPeopleScope = useRef('');
  const requestedLedgerId = searchParams.get('ledgerId') ?? '';
  const requestedPlanId = searchParams.get('planId') ?? '';

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      ledgerId: requestedLedgerId,
      planId: requestedPlanId,
      title: '',
      amount: '',
      payerUserId: user?.id ?? '',
      participantUserIds: [],
      splitMethod: 'EQUAL',
      expenseDate: new Date().toISOString().slice(0, 10),
      description: '',
      categoryId: '',
      isGift: false,
    },
  });

  const ledgerId = useWatch({ control, name: 'ledgerId' });
  const planId = useWatch({ control, name: 'planId' });
  const splitMethod = useWatch({ control, name: 'splitMethod' });
  const selectedPeople = useWatch({ control, name: 'participantUserIds' });
  const isGift = useWatch({ control, name: 'isGift' });
  const amount = useWatch({ control, name: 'amount' });
  const selectedLedger = ledgers.data?.find((ledger) => ledger.id === ledgerId);
  const plans = usePlans(ledgerId);
  const categories = useCategories(ledgerId);
  const members = useQuery({
    queryKey: queryKeys.members(ledgerId),
    queryFn: () => api.ledgers.members(ledgerId),
    enabled: Boolean(ledgerId),
  });
  const participants = useQuery({
    queryKey: queryKeys.participants(planId ?? ''),
    queryFn: () => api.plans.participants(planId ?? ''),
    enabled: Boolean(planId),
  });

  const people = useMemo(
    () =>
      planId
        ? (participants.data ?? []).map((participant) => participant.user)
        : (members.data ?? []).map((member) => member.user),
    [members.data, participants.data, planId],
  );
  const preview = useMemo(() => {
    const minor = parseMoneyToMinor(amount);
    if (!minor || !selectedPeople.length) return [];
    if (splitMethod === 'EQUAL') return equalPreview(minor, selectedPeople);
    return selectedPeople.map((userId) => ({
      userId,
      label: allocations[userId] || '—',
    }));
  }, [allocations, amount, selectedPeople, splitMethod]);

  async function createCategory() {
    if (!newCategory.trim() || !ledgerId) return;
    try {
      const category = await api.categories.create(ledgerId, {
        name: newCategory.trim(),
        kind: 'EXPENSE',
      });
      await categories.refetch();
      await invalidateFinancialData(queryClient, {
        ledgerId,
        balances: false,
        offsetAvailability: false,
        allPlanAnalytics: true,
      });
      setValue('categoryId', category.id);
      setNewCategory('');
      toast('Kategori oluşturuldu.');
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : 'Kategori oluşturulamadı.',
      );
    }
  }

  useEffect(() => {
    if (!ledgerId && ledgers.data?.length) {
      const defaultLedger =
        ledgers.data.find((ledger) => ledger.type === 'PERSONAL') ??
        ledgers.data[0];
      if (defaultLedger) setValue('ledgerId', defaultLedger.id);
    }
  }, [ledgerId, ledgers.data, setValue]);

  useEffect(() => {
    const scope = `${ledgerId}:${planId ?? ''}:${people.map((person) => person.id).join(',')}`;
    if (!people.length || scope === lastPeopleScope.current) return;
    lastPeopleScope.current = scope;
    setValue(
      'participantUserIds',
      people.map((person) => person.id),
    );
    const preferredPayer =
      people.find((person) => person.id === user?.id) ?? people[0];
    if (preferredPayer) setValue('payerUserId', preferredPayer.id);
  }, [ledgerId, people, planId, setValue, user?.id]);

  function updateAllocation(userId: string, value: string) {
    setAllocations((current) => ({ ...current, [userId]: value }));
  }

  async function onSubmit(values: Values) {
    setFormError(null);
    const amountMinor = parseMoneyToMinor(values.amount);
    if (!amountMinor) return setFormError('Geçerli bir tutar yaz.');
    let split;
    try {
      split = buildSplit(
        values.splitMethod,
        values.participantUserIds,
        allocations,
        amountMinor,
      );
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Payları kontrol et.',
      );
      return;
    }

    try {
      const expense = await createExpense.mutateAsync({
        ledgerId: values.ledgerId,
        input: {
          title: values.title,
          description: values.description || null,
          amountMinor,
          payerUserId: values.payerUserId,
          planId: values.planId || null,
          categoryId: values.categoryId || null,
          isGift: values.isGift,
          expenseDate: new Date(`${values.expenseDate}T12:00:00`).toISOString(),
          split,
        },
      });
      toast(
        values.isGift
          ? 'Ismarlama Deftere yazıldı.'
          : 'Harcama paylaştırıldı ve Deftere yazıldı.',
      );
      router.push(`/expenses/${expense.id}`);
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : 'Harcama eklenemedi. Tekrar dene.',
      );
    }
  }

  return (
    <form className="smart-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <section className="smart-form__main paper-section">
        <div className="form-question">
          <span>1</span>
          <div>
            <small>Ne için?</small>
            <h2>Harcamanın kısa adı</h2>
          </div>
        </div>
        <label className="field">
          <span>Harcama</span>
          <input
            className="input input--large"
            autoFocus
            placeholder="Örn. Akşam yemeği"
            {...register('title')}
          />
          {errors.title ? <small>{errors.title.message}</small> : null}
        </label>
        <label className="field">
          <span>
            Not <em>isteğe bağlı</em>
          </span>
          <textarea
            className="input"
            rows={2}
            placeholder="Hatırlamak isteyeceğin küçük bir ayrıntı"
            {...register('description')}
          />
        </label>

        <div className="form-divider" />
        <div className="form-question">
          <span>2</span>
          <div>
            <small>Ne kadar?</small>
            <h2>Ödenen tutar</h2>
          </div>
        </div>
        <div className="amount-input">
          <input
            inputMode="decimal"
            placeholder="0,00"
            aria-label="Harcama tutarı"
            {...register('amount')}
          />
          <strong>{selectedLedger?.currency ?? 'TRY'}</strong>
        </div>
        {errors.amount ? (
          <p className="field-error">{errors.amount.message}</p>
        ) : null}
        <p className="form-hint">
          Para birimi Defterden gelir ve bu harcama için değiştirilemez.
        </p>

        <div className="form-divider" />
        <div className="field-row">
          <label className="field">
            <span>Defter</span>
            {requestedLedgerId ? (
              <>
                <input type="hidden" {...register('ledgerId')} />
                <div className="context-note">
                  {selectedLedger?.name ?? 'Seçili Defter'} içinde
                  oluşturulacak.
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
            {errors.ledgerId ? <small>{errors.ledgerId.message}</small> : null}
          </label>
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
        </div>
        <label className="field">
          <span>
            Kategori <em>isteğe bağlı</em>
          </span>
          <select className="input" {...register('categoryId')}>
            <option value="">Kategorisiz</option>
            {categories.data
              ?.filter(
                (category) =>
                  !category.archivedAt &&
                  (category.kind === 'EXPENSE' || category.kind === 'BOTH'),
              )
              .map((category) => (
                <option value={category.id} key={category.id}>
                  {category.name}
                </option>
              ))}
          </select>
        </label>
        <div className="add-row">
          <input
            className="input"
            value={newCategory}
            onChange={(event) => setNewCategory(event.target.value)}
            placeholder="Yeni kategori adı"
            aria-label="Yeni kategori adı"
          />
          <button
            className="button button--quiet button--small"
            type="button"
            disabled={!newCategory.trim()}
            onClick={() => void createCategory()}
          >
            Kategori ekle
          </button>
        </div>
        <label className="field field--date">
          <span>Harcama tarihi</span>
          <input className="input" type="date" {...register('expenseDate')} />
        </label>
      </section>

      <aside className="smart-form__side">
        <section className="paper-section smart-form__people">
          <div className="form-question">
            <span>3</span>
            <div>
              <small>Kim ödedi?</small>
              <h2>Ödemeyi yapan</h2>
            </div>
          </div>
          <div className="choice-list">
            {people.map((person) => (
              <label key={person.id}>
                <input
                  type="radio"
                  value={person.id}
                  {...register('payerUserId')}
                />
                <span className="avatar avatar--paper">
                  {person.displayName[0]}
                </span>
                <strong>
                  {person.displayName}
                  {person.id === user?.id ? ' (sen)' : ''}
                </strong>
                <Check />
              </label>
            ))}
          </div>
          {errors.payerUserId ? (
            <p className="field-error">{errors.payerUserId.message}</p>
          ) : null}

          <div className="form-divider" />
          <div className="form-question">
            <span>4</span>
            <div>
              <small>Kimler paylaşıyor?</small>
              <h2>Payı olan kişiler</h2>
            </div>
          </div>
          <div className="choice-list">
            {people.map((person) => (
              <label key={person.id}>
                <input
                  type="checkbox"
                  value={person.id}
                  {...register('participantUserIds')}
                />
                <span className="avatar avatar--paper">
                  {person.displayName[0]}
                </span>
                <strong>
                  {person.displayName}
                  {person.id === user?.id ? ' (sen)' : ''}
                </strong>
                <Check />
              </label>
            ))}
          </div>
          {errors.participantUserIds ? (
            <p className="field-error">{errors.participantUserIds.message}</p>
          ) : null}
        </section>

        {preview.length ? (
          <section className="paper-section split-preview">
            <span className="eyebrow">Canlı özet</span>
            <h3>Paylaştırma önizlemesi</h3>
            {preview.map((item) => (
              <div key={item.userId}>
                <span>
                  {
                    people.find((person) => person.id === item.userId)
                      ?.displayName
                  }
                </span>
                <strong>
                  {'amountMinor' in item
                    ? formatMoneyFromMinor(
                        item.amountMinor,
                        selectedLedger?.currency,
                      )
                    : `${item.label}${splitMethod === 'PERCENTAGE' ? '%' : splitMethod === 'SHARES' ? ' pay' : ` ${selectedLedger?.currency ?? ''}`}`}
                </strong>
              </div>
            ))}
            <small>
              Kuruş farklarını Defterdar adil ve tutarlı biçimde dağıtır.
            </small>
          </section>
        ) : null}

        <section className="paper-section smart-form__split">
          <div className="form-question">
            <span>5</span>
            <div>
              <small>Nasıl paylaşalım?</small>
              <h2>Paylaştırma biçimi</h2>
            </div>
          </div>
          <div className="split-options">
            {splitOptions.map((option) => (
              <label key={option.value}>
                <input
                  type="radio"
                  value={option.value}
                  {...register('splitMethod')}
                />
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.help}</small>
                </span>
                <Check />
              </label>
            ))}
          </div>
          {splitMethod !== 'EQUAL' ? (
            <div className="allocation-list">
              {people
                .filter((person) => selectedPeople.includes(person.id))
                .map((person) => (
                  <label key={person.id}>
                    <span>{person.displayName}</span>
                    <span>
                      <input
                        inputMode="decimal"
                        value={allocations[person.id] ?? ''}
                        onChange={(event) =>
                          updateAllocation(person.id, event.target.value)
                        }
                        aria-label={`${person.displayName} payı`}
                      />
                      <b>
                        {splitMethod === 'EXACT'
                          ? selectedLedger?.currency
                          : splitMethod === 'PERCENTAGE'
                            ? '%'
                            : 'pay'}
                      </b>
                    </span>
                  </label>
                ))}
            </div>
          ) : null}
        </section>

        <section className={`gift-toggle${isGift ? ' is-active' : ''}`}>
          <label>
            <input type="checkbox" {...register('isGift')} />
            <span>
              <Gift />
            </span>
            <span>
              <strong>Bu benden — Ismarla</strong>
              <small>Kimse için geri ödeme borcu oluşmasın.</small>
            </span>
            <Check />
          </label>
          <details className="help-popover">
            <summary>
              <CircleHelp /> Ismarla ne demek?
            </summary>
            <p>
              Herkesin payı kayda geçer ama senden geri ödeme yapmaları
              beklenmez.
            </p>
          </details>
        </section>

        {formError ? (
          <div className="form-error" role="alert">
            {formError}
          </div>
        ) : null}
        <button
          className="button button--primary button--wide button--tall"
          type="submit"
          disabled={createExpense.isPending || !people.length}
        >
          <ReceiptText />{' '}
          {createExpense.isPending
            ? 'Deftere yazılıyor…'
            : isGift
              ? 'Ismarlamayı kaydet'
              : 'Harcamayı paylaştır'}{' '}
          <ArrowRight />
        </button>
      </aside>
    </form>
  );
}
