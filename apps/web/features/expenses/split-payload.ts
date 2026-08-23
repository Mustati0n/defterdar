import { parseMoneyToMinor, parsePercentageToBps } from '@/lib/money';
import type { CreateExpenseInput, SplitMethod } from '@/lib/types';

export function buildSplit(
  method: SplitMethod,
  participantUserIds: string[],
  allocations: Record<string, string>,
  amountMinor: number,
): CreateExpenseInput['split'] {
  if (!participantUserIds.length) throw new Error('En az bir kişi seç.');
  if (method === 'EQUAL') return { method, participantUserIds };

  const entries = participantUserIds.map((userId) => {
    const raw = allocations[userId] ?? '';
    if (method === 'EXACT') {
      const value = parseMoneyToMinor(raw);
      if (value === null)
        throw new Error('Her kişi için geçerli bir tutar yaz.');
      return { userId, amountMinor: value };
    }
    if (method === 'PERCENTAGE') {
      const value = parsePercentageToBps(raw);
      if (value === null)
        throw new Error('Her kişi için geçerli bir yüzde yaz.');
      return { userId, percentageBps: value };
    }
    const shares = /^\d+$/.test(raw.trim()) ? Number(raw) : 0;
    if (!shares) throw new Error('Seçilen herkes için en az 1 pay yaz.');
    return { userId, shares };
  });

  if (
    method === 'EXACT' &&
    entries.reduce((sum, entry) => sum + (entry.amountMinor ?? 0), 0) !==
      amountMinor
  )
    throw new Error('Kişi paylarının toplamı harcama tutarıyla aynı olmalı.');
  if (
    method === 'PERCENTAGE' &&
    entries.reduce((sum, entry) => sum + (entry.percentageBps ?? 0), 0) !==
      10_000
  )
    throw new Error('Yüzdelerin toplamı %100 olmalı.');
  return { method, entries };
}
