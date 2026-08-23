export function parseMoneyToMinor(value: string): number | null {
  const compact = value.trim().replace(/\s/g, '');
  if (!compact) return null;
  const normalized = compact.includes(',')
    ? compact.replace(/\./g, '').replace(',', '.')
    : compact;
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) return null;
  const minor =
    BigInt(match[1]!) * 100n + BigInt((match[2] ?? '').padEnd(2, '0'));
  return minor <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(minor) : null;
}

export function parsePercentageToBps(value: string): number | null {
  return parseMoneyToMinor(value);
}

export function equalPreview(amountMinor: number, userIds: string[]) {
  if (!userIds.length) return [];
  const base = Math.floor(amountMinor / userIds.length);
  let remainder = amountMinor - base * userIds.length;
  return [...userIds].sort().map((userId) => ({
    userId,
    amountMinor: base + (remainder-- > 0 ? 1 : 0),
  }));
}
