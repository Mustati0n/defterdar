import { Check, CircleHelp, Gift } from 'lucide-react';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import type { SplitMethod } from '@/lib/types';
import { formatMoneyFromMinor } from '@/lib/format';
import type { ExpenseFormValues } from './expense-form-config';
import { splitOptions } from './expense-form-config';

export interface ExpenseFormPerson {
  id: string;
  displayName: string;
}

export type ExpensePreviewItem =
  { userId: string; amountMinor: number } | { userId: string; label: string };

interface ParticipantsSectionProps {
  people: ExpenseFormPerson[];
  currentUserId?: string;
  register: UseFormRegister<ExpenseFormValues>;
  errors: FieldErrors<ExpenseFormValues>;
}

export function ParticipantsSection({
  people,
  currentUserId,
  register,
  errors,
}: ParticipantsSectionProps) {
  return (
    <section className="paper-section smart-form__people">
      <div className="form-question">
        <span>3</span>
        <div>
          <small>Kim ödedi?</small>
          <h2>Ödemeyi yapan</h2>
        </div>
      </div>
      <div
        className="choice-list"
        role="radiogroup"
        aria-label="Ödemeyi yapan"
        aria-invalid={Boolean(errors.payerUserId)}
        aria-describedby={
          errors.payerUserId ? 'expense-payer-error' : undefined
        }
      >
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
              {person.id === currentUserId ? ' (sen)' : ''}
            </strong>
            <Check />
          </label>
        ))}
      </div>
      {errors.payerUserId ? (
        <p className="field-error" id="expense-payer-error">
          {errors.payerUserId.message}
        </p>
      ) : null}

      <div className="form-divider" />
      <div className="form-question">
        <span>4</span>
        <div>
          <small>Kimler paylaşıyor?</small>
          <h2>Payı olan kişiler</h2>
        </div>
      </div>
      <div
        className="choice-list"
        role="group"
        aria-label="Payı olan kişiler"
        aria-describedby={
          errors.participantUserIds ? 'expense-participants-error' : undefined
        }
      >
        {people.map((person) => (
          <label key={person.id}>
            <input
              type="checkbox"
              value={person.id}
              aria-invalid={Boolean(errors.participantUserIds)}
              aria-describedby={
                errors.participantUserIds
                  ? 'expense-participants-error'
                  : undefined
              }
              {...register('participantUserIds')}
            />
            <span className="avatar avatar--paper">
              {person.displayName[0]}
            </span>
            <strong>
              {person.displayName}
              {person.id === currentUserId ? ' (sen)' : ''}
            </strong>
            <Check />
          </label>
        ))}
      </div>
      {errors.participantUserIds ? (
        <p className="field-error" id="expense-participants-error">
          {errors.participantUserIds.message}
        </p>
      ) : null}
    </section>
  );
}

interface ExpensePreviewProps {
  preview: ExpensePreviewItem[];
  people: ExpenseFormPerson[];
  splitMethod: SplitMethod;
  currency?: string;
}

export function ExpensePreview({
  preview,
  people,
  splitMethod,
  currency,
}: ExpensePreviewProps) {
  if (!preview.length) return null;
  return (
    <section className="paper-section split-preview">
      <span className="eyebrow">Canlı özet</span>
      <h3>Paylaştırma önizlemesi</h3>
      {preview.map((item) => (
        <div key={item.userId}>
          <span>
            {people.find((person) => person.id === item.userId)?.displayName}
          </span>
          <strong>
            {'amountMinor' in item
              ? formatMoneyFromMinor(item.amountMinor, currency)
              : `${item.label}${splitMethod === 'PERCENTAGE' ? '%' : splitMethod === 'SHARES' ? ' pay' : ` ${currency ?? ''}`}`}
          </strong>
        </div>
      ))}
    </section>
  );
}

interface SplitMethodSectionProps {
  splitMethod: SplitMethod;
  people: ExpenseFormPerson[];
  selectedPeople: string[];
  allocations: Record<string, string>;
  currency?: string;
  register: UseFormRegister<ExpenseFormValues>;
  updateAllocation: (userId: string, value: string) => void;
}

export function SplitMethodSection({
  splitMethod,
  people,
  selectedPeople,
  allocations,
  currency,
  register,
  updateAllocation,
}: SplitMethodSectionProps) {
  return (
    <section className="paper-section smart-form__split">
      <div className="form-question">
        <span>5</span>
        <div>
          <small>Nasıl paylaşalım?</small>
          <h2>Paylaştırma biçimi</h2>
        </div>
      </div>
      <div className="split-options">
        {splitOptions.slice(0, 1).map((option) => (
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
        <details
          className="advanced-split"
          open={splitMethod !== 'EQUAL' || undefined}
        >
          <summary>Diğer paylaşım yöntemleri</summary>
          <div>
            {splitOptions.slice(1).map((option) => (
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
        </details>
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
                      ? currency
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
  );
}

export function GiftOption({
  isGift,
  register,
}: {
  isGift: boolean;
  register: UseFormRegister<ExpenseFormValues>;
}) {
  return (
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
          Herkesin payı kayda geçer ama senden geri ödeme yapmaları beklenmez.
        </p>
      </details>
    </section>
  );
}
