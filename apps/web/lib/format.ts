export function formatMoneyFromMinor(
  amountMinor: number | string,
  currency = 'TRY',
): string {
  const amount = Number(amountMinor) / 100;
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatDate(
  value: string | null,
  fallback = 'Tarih belirtilmedi',
): string {
  if (!value) return fallback;
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('tr-TR'))
    .join('');
}

export function planStatusLabel(status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED') {
  return {
    ACTIVE: 'Devam ediyor',
    COMPLETED: 'Tamamlandı',
    ARCHIVED: 'Arşivde',
  }[status];
}

export function ledgerRoleLabel(role: 'OWNER' | 'ADMIN' | 'MEMBER') {
  return { OWNER: 'Sahip', ADMIN: 'Yönetici', MEMBER: 'Üye' }[role];
}

export function splitMethodLabel(
  method: 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES',
) {
  return {
    EQUAL: 'Eşit böl',
    EXACT: 'Tutar gir',
    PERCENTAGE: 'Yüzdeyle böl',
    SHARES: 'Pay oranı',
  }[method];
}
