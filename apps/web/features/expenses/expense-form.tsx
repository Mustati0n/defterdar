'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  ReceiptText,
  Scale,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useToast } from '@/components/ui/toast';
import {
  queryKeys,
  useCreateExpense,
  useLedgers,
  usePlan,
  usePlans,
} from '@/features/data/hooks';
import { useAuth } from '@/features/auth/auth-provider';
import { api, ApiError } from '@/lib/api-client';
import { useCategories } from '@/features/data/hooks';
import { parseMoneyToMinor, equalPreview } from '@/lib/money';
import { buildSplit } from './split-payload';
import { invalidateFinancialData } from '@/features/data/financial-invalidation';
import {
  expenseFormSchema,
  type ExpenseFormValues,
} from './expense-form-config';
import {
  ExpensePreview,
  GiftOption,
  ParticipantsSection,
  SplitMethodSection,
} from './expense-form-sections';

const wizardSteps = [
  { label: 'Harcama', icon: ReceiptText },
  { label: 'Kişiler', icon: UsersRound },
  { label: 'Paylaşım', icon: Scale },
] as const;

export function ExpenseForm({
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
  presentation?: 'page' | 'wizard' | 'dialog';
} = {}) {
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
  const [step, setStep] = useState(0);
  const lastPeopleScope = useRef('');
  const requestedLedgerId =
    initialLedgerId ?? searchParams.get('ledgerId') ?? '';
  const requestedPlanId = initialPlanId ?? searchParams.get('planId') ?? '';
  const requestedPlan = usePlan(requestedPlanId);
  const isWizard = presentation !== 'page';

  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    control,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
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
  const standalonePlan = requestedPlan.data?.scope === 'STANDALONE';
  const selectedCurrency =
    selectedLedger?.currency ?? requestedPlan.data?.currency;
  const plans = usePlans(ledgerId, false, Boolean(ledgerId));
  const categories = useCategories(ledgerId);
  const members = useQuery({
    queryKey: queryKeys.members(ledgerId),
    queryFn: ({ signal }) => api.ledgers.members(ledgerId, signal),
    enabled: Boolean(ledgerId),
  });
  const participants = useQuery({
    queryKey: queryKeys.participants(planId ?? ''),
    queryFn: ({ signal }) => api.plans.participants(planId ?? '', signal),
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

  async function onSubmit(values: ExpenseFormValues) {
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
        ledgerId: values.ledgerId || null,
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
      onComplete?.();
      router.push(`/expenses/${expense.id}`);
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : 'Harcama eklenemedi. Tekrar dene.',
      );
    }
  }

  async function goForward() {
    const valid = await trigger(
      step === 0
        ? ['title', 'amount', 'ledgerId', 'expenseDate']
        : ['payerUserId', 'participantUserIds'],
      { shouldFocus: true },
    );
    if (valid) setStep((current) => Math.min(2, current + 1));
  }

  return (
    <form
      className={`smart-form${isWizard ? ' expense-wizard' : ''}`}
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      {isWizard ? (
        <nav className="expense-wizard__progress" aria-label="Harcama adımları">
          {wizardSteps.map(({ label, icon: Icon }, index) => (
            <button
              type="button"
              key={label}
              className={
                index === step
                  ? 'is-current'
                  : index < step
                    ? 'is-complete'
                    : ''
              }
              aria-current={index === step ? 'step' : undefined}
              disabled={index > step}
              onClick={() => index < step && setStep(index)}
              title={`${index + 1}. adım: ${label}`}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      ) : null}

      {!isWizard || step === 0 ? (
        <section className="smart-form__main paper-section">
          <div className="form-question">
            <span title="Harcama bilgileri">
              <ReceiptText aria-hidden="true" />
            </span>
            <div>
              <small>Ne için?</small>
              <h2>Harcamanın kısa adı</h2>
            </div>
          </div>
          <div className="field">
            <label htmlFor="expense-title">Harcama</label>
            <input
              id="expense-title"
              className="input input--large"
              autoFocus
              placeholder="Örn. Akşam yemeği"
              aria-invalid={Boolean(errors.title)}
              aria-describedby={
                errors.title ? 'expense-title-error' : undefined
              }
              {...register('title')}
            />
            {errors.title ? (
              <small id="expense-title-error" role="alert">
                {errors.title.message}
              </small>
            ) : null}
          </div>

          <div className="form-divider" />
          <div className="form-question">
            <span title="Tutar">
              <WalletCards aria-hidden="true" />
            </span>
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
              aria-invalid={Boolean(errors.amount)}
              aria-describedby={`expense-amount-help${errors.amount ? ' expense-amount-error' : ''}`}
              {...register('amount')}
            />
            <strong>{selectedCurrency ?? 'TRY'}</strong>
          </div>
          {errors.amount ? (
            <p className="field-error" id="expense-amount-error" role="alert">
              {errors.amount.message}
            </p>
          ) : null}
          <p className="form-hint" id="expense-amount-help">
            Para birimi {standalonePlan ? 'Plandan' : 'Defterden'} gelir ve bu
            harcama için değiştirilemez.
          </p>

          <div className="form-divider" />
          <label className="field">
            <span>{standalonePlan ? 'Plan' : 'Defter'}</span>
            {standalonePlan ? (
              <>
                <input type="hidden" {...register('ledgerId')} />
                <div className="context-note">
                  {requestedPlan.data?.name ?? 'Seçili bağımsız Plan'} içinde
                  oluşturulacak.
                </div>
              </>
            ) : requestedLedgerId ? (
              <>
                <input type="hidden" {...register('ledgerId')} />
                <div className="context-note">
                  {selectedLedger?.name ?? 'Seçili Defter'} içinde
                  oluşturulacak.
                </div>
              </>
            ) : (
              <select
                className="input"
                aria-invalid={Boolean(errors.ledgerId)}
                aria-describedby={
                  errors.ledgerId ? 'expense-ledger-error' : undefined
                }
                {...register('ledgerId')}
              >
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
            {errors.ledgerId ? (
              <small id="expense-ledger-error">{errors.ledgerId.message}</small>
            ) : null}
          </label>
          {requestedPlanId ? (
            <input type="hidden" {...register('planId')} />
          ) : null}
          <details className="form-disclosure">
            <summary>İsteğe bağlı ayrıntılar</summary>
            <div className="stack-form">
              <label className="field">
                <span>Not</span>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Kısa bir açıklama"
                  {...register('description')}
                />
              </label>
              {!requestedPlanId ? (
                <label className="field">
                  <span>Plan</span>
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
              ) : null}
              {!standalonePlan ? (
                <label className="field">
                  <span>Kategori</span>
                  <select className="input" {...register('categoryId')}>
                    <option value="">Kategorisiz</option>
                    {categories.data
                      ?.filter(
                        (category) =>
                          !category.archivedAt &&
                          (category.kind === 'EXPENSE' ||
                            category.kind === 'BOTH'),
                      )
                      .map((category) => (
                        <option value={category.id} key={category.id}>
                          {category.name}
                        </option>
                      ))}
                  </select>
                </label>
              ) : null}
              {!standalonePlan ? (
                <details className="nested-disclosure">
                  <summary>Yeni kategori oluştur</summary>
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
                </details>
              ) : null}
              <label className="field field--date">
                <span>Harcama tarihi</span>
                <input
                  className="input"
                  type="date"
                  aria-invalid={Boolean(errors.expenseDate)}
                  aria-describedby={
                    errors.expenseDate ? 'expense-date-error' : undefined
                  }
                  {...register('expenseDate')}
                />
                {errors.expenseDate ? (
                  <small id="expense-date-error">
                    {errors.expenseDate.message}
                  </small>
                ) : null}
              </label>
            </div>
          </details>
        </section>
      ) : null}

      <aside className="smart-form__side">
        {!isWizard || step === 1 ? (
          <ParticipantsSection
            people={people}
            currentUserId={user?.id}
            register={register}
            errors={errors}
          />
        ) : null}

        {!isWizard || step === 2 ? (
          <>
            <ExpensePreview
              preview={preview}
              people={people}
              splitMethod={splitMethod}
              currency={selectedCurrency}
            />

            <SplitMethodSection
              splitMethod={splitMethod}
              people={people}
              selectedPeople={selectedPeople}
              allocations={allocations}
              currency={selectedCurrency}
              register={register}
              updateAllocation={updateAllocation}
            />

            <GiftOption isGift={isGift} register={register} />
          </>
        ) : null}

        {formError ? (
          <div className="form-error" role="alert">
            {formError}
          </div>
        ) : null}
        {isWizard ? (
          <div className="expense-wizard__actions">
            {step === 0 && onCancel ? (
              <button
                className="button button--quiet"
                type="button"
                onClick={onCancel}
              >
                Vazgeç
              </button>
            ) : step > 0 ? (
              <button
                className="button button--quiet"
                type="button"
                onClick={() => setStep((current) => current - 1)}
              >
                <ArrowLeft /> Geri
              </button>
            ) : null}
            {step < 2 ? (
              <button
                className="button button--primary"
                type="button"
                disabled={step === 1 && !people.length}
                onClick={() => void goForward()}
              >
                Devam <ArrowRight />
              </button>
            ) : (
              <button
                className="button button--primary"
                type="submit"
                disabled={createExpense.isPending || !people.length}
              >
                <ReceiptText />{' '}
                {createExpense.isPending
                  ? 'Deftere yazılıyor…'
                  : isGift
                    ? 'Ismarlamayı kaydet'
                    : 'Harcamayı kaydet'}
              </button>
            )}
          </div>
        ) : (
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
                : 'Harcamayı kaydet'}{' '}
            <ArrowRight />
          </button>
        )}
      </aside>
    </form>
  );
}
