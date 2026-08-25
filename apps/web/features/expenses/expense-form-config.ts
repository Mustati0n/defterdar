import { z } from 'zod';
import type { SplitMethod } from '@/lib/types';
import { parseMoneyToMinor } from '@/lib/money';

export const expenseFormSchema = z
  .object({
    ledgerId: z.string(),
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

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export const splitOptions: Array<{
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
