'use client';

import { useQuery } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import {
  queryKeys,
  useCategories,
  useExpense,
  usePlans,
  useUpdateExpense,
} from '@/features/data/hooks';
import { api, ApiError } from '@/lib/api-client';
import { parseMoneyToMinor } from '@/lib/money';
import type { Expense, SplitMethod, UpdateExpenseInput } from '@/lib/types';
import { buildSplit } from './split-payload';

export function ExpenseEditForm({ expenseId }: { expenseId: string }) {
  const expense = useExpense(expenseId);
  if (expense.isLoading) return <p>Harcamanın son hali yükleniyor…</p>;
  if (!expense.data)
    return <div className="form-error">Harcama yüklenemedi.</div>;
  return (
    <LoadedExpenseEditForm
      key={expense.data.version}
      expenseId={expenseId}
      data={expense.data}
    />
  );
}

function minorInput(value: string) {
  return `${BigInt(value) / 100n},${String(BigInt(value) % 100n).padStart(2, '0')}`;
}

function LoadedExpenseEditForm({
  expenseId,
  data,
}: {
  expenseId: string;
  data: Expense;
}) {
  const router = useRouter();
  const toast = useToast();
  const update = useUpdateExpense(expenseId);
  const [title, setTitle] = useState(data.title);
  const [description, setDescription] = useState(data.description ?? '');
  const [amount, setAmount] = useState(minorInput(data.amountMinor));
  const [payer, setPayer] = useState(data.payerId);
  const [planId, setPlanId] = useState(data.planId ?? '');
  const [categoryId, setCategoryId] = useState(data.categoryId ?? '');
  const [date, setDate] = useState(data.expenseDate.slice(0, 10));
  const [isGift, setIsGift] = useState(data.isGift);
  const [method, setMethod] = useState<SplitMethod>('EXACT');
  const [selected, setSelected] = useState<string[]>(
    data.splits.map((split) => split.user.id),
  );
  const [allocations, setAllocations] = useState<Record<string, string>>(
    Object.fromEntries(
      data.splits.map((split) => [
        split.user.id,
        minorInput(split.amountMinor),
      ]),
    ),
  );
  const [splitTouched, setSplitTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ledgerId = data.ledgerId;
  const plans = usePlans(ledgerId);
  const categories = useCategories(ledgerId);
  const members = useQuery({
    queryKey: queryKeys.members(ledgerId),
    queryFn: () => api.ledgers.members(ledgerId),
    enabled: Boolean(ledgerId),
  });
  const participants = useQuery({
    queryKey: queryKeys.participants(planId),
    queryFn: () => api.plans.participants(planId),
    enabled: Boolean(planId),
  });
  const people = useMemo(
    () =>
      planId
        ? (participants.data ?? []).map((item) => item.user)
        : (members.data ?? []).map((item) => item.user),
    [members.data, participants.data, planId],
  );
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const amountMinor = parseMoneyToMinor(amount);
    if (!title.trim() || !amountMinor)
      return setError('Adı ve tutarı kontrol et.');
    const changesFinancial =
      splitTouched ||
      amountMinor !== Number(data.amountMinor) ||
      payer !== data.payerId ||
      (planId || null) !== data.planId ||
      isGift !== data.isGift;
    const payload: UpdateExpenseInput = {
      expectedVersion: data.version,
      title: title.trim(),
      description: description.trim() || null,
      categoryId: categoryId || null,
      expenseDate: new Date(`${date}T12:00:00`).toISOString(),
    };
    if (changesFinancial) {
      try {
        payload.split = buildSplit(method, selected, allocations, amountMinor);
      } catch (splitError) {
        return setError(
          splitError instanceof Error
            ? splitError.message
            : 'Payları kontrol et.',
        );
      }
      payload.amountMinor = amountMinor;
      payload.payerUserId = payer;
      payload.planId = planId || null;
      payload.isGift = isGift;
    }
    try {
      await update.mutateAsync(payload);
      toast('Harcama güncellendi.');
      router.push(`/expenses/${expenseId}`);
    } catch (mutationError) {
      setError(
        mutationError instanceof ApiError
          ? mutationError.message
          : 'Harcama güncellenemedi.',
      );
    }
  }
  return (
    <form
      className="paper-section expense-edit-form stack-form"
      onSubmit={(event) => void submit(event)}
    >
      <div className="context-note">
        Defter ve para birimi kilitli: {data.currency}
      </div>
      <label className="field">
        <span>Harcama adı</span>
        <input
          className="input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
      <label className="field">
        <span>Not</span>
        <textarea
          className="input"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      <div className="field-row">
        <label className="field">
          <span>Tutar</span>
          <input
            className="input"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Tarih</span>
          <input
            className="input"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
      </div>
      <div className="field-row">
        <label className="field">
          <span>Plan</span>
          <select
            className="input"
            value={planId}
            onChange={(event) => setPlanId(event.target.value)}
          >
            <option value="">Plana bağlı değil</option>
            {plans.data
              ?.filter(
                (plan) => plan.status === 'ACTIVE' || plan.id === data.planId,
              )
              .map((plan) => (
                <option value={plan.id} key={plan.id}>
                  {plan.name}
                </option>
              ))}
          </select>
        </label>
        <label className="field">
          <span>Kategori</span>
          <select
            className="input"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="">Kategorisiz</option>
            {categories.data
              ?.filter((category) => !category.archivedAt)
              .map((category) => (
                <option value={category.id} key={category.id}>
                  {category.name}
                </option>
              ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span>Ödeyen</span>
        <select
          className="input"
          value={payer}
          onChange={(event) => setPayer(event.target.value)}
        >
          {people.map((person) => (
            <option value={person.id} key={person.id}>
              {person.displayName}
            </option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend>Payı olan kişiler</legend>
        <div className="choice-list">
          {people.map((person) => (
            <label key={person.id}>
              <input
                type="checkbox"
                checked={selected.includes(person.id)}
                onChange={(event) => {
                  setSplitTouched(true);
                  setSelected((current) =>
                    event.target.checked
                      ? [...current, person.id]
                      : current.filter((id) => id !== person.id),
                  );
                }}
              />
              <span className="avatar avatar--paper">
                {person.displayName[0]}
              </span>
              <strong>{person.displayName}</strong>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="field">
        <span>Paylaştırma</span>
        <select
          className="input"
          value={method}
          onChange={(event) => {
            setSplitTouched(true);
            setMethod(event.target.value as SplitMethod);
          }}
        >
          <option value="EQUAL">Eşit</option>
          <option value="EXACT">Tam tutar</option>
          <option value="PERCENTAGE">Yüzde</option>
          <option value="SHARES">Pay oranı</option>
        </select>
        <small>
          Kayıtlı paylar güvenli düzenleme için tam tutar olarak açılır.
        </small>
      </label>
      {method !== 'EQUAL' ? (
        <div className="allocation-list">
          {people
            .filter((person) => selected.includes(person.id))
            .map((person) => (
              <label key={person.id}>
                <span>{person.displayName}</span>
                <span>
                  <input
                    inputMode="decimal"
                    value={allocations[person.id] ?? ''}
                    onChange={(event) => {
                      setSplitTouched(true);
                      setAllocations((current) => ({
                        ...current,
                        [person.id]: event.target.value,
                      }));
                    }}
                  />
                  <b>
                    {method === 'EXACT'
                      ? data.currency
                      : method === 'PERCENTAGE'
                        ? '%'
                        : 'pay'}
                  </b>
                </span>
              </label>
            ))}
        </div>
      ) : null}
      <label className="gift-toggle">
        <input
          type="checkbox"
          checked={isGift}
          onChange={(event) => setIsGift(event.target.checked)}
        />
        <span>Bu benden — Ismarla</span>
      </label>
      {error ? (
        <div className="form-error" role="alert">
          {error}
        </div>
      ) : null}
      <button
        className="button button--primary button--tall"
        type="submit"
        disabled={update.isPending}
      >
        <Save /> {update.isPending ? 'Kaydediliyor…' : 'Değişiklikleri kaydet'}
      </button>
    </form>
  );
}
