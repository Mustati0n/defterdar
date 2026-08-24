export type AnalyticsPreset =
  'month' | '3months' | '6months' | 'year' | 'all' | 'custom';

export const analyticsPresets: Array<{
  id: AnalyticsPreset;
  label: string;
}> = [
  { id: 'month', label: 'Bu ay' },
  { id: '3months', label: 'Son 3 ay' },
  { id: '6months', label: 'Son 6 ay' },
  { id: 'year', label: 'Bu yıl' },
  { id: 'all', label: 'Tüm zamanlar' },
  { id: 'custom', label: 'Özel tarih' },
];

function dayStart(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value.toISOString();
}

function dayEnd(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value.toISOString();
}

export function analyticsDateRange(
  preset: AnalyticsPreset,
  now = new Date(),
  custom?: { from: string; to: string },
) {
  if (preset === 'all') return {};
  if (preset === 'custom') {
    return {
      from: custom?.from
        ? dayStart(new Date(`${custom.from}T00:00:00`))
        : undefined,
      to: custom?.to ? dayEnd(new Date(`${custom.to}T00:00:00`)) : undefined,
    };
  }

  const from = new Date(now);
  if (preset === 'month') from.setDate(1);
  if (preset === '3months') {
    from.setMonth(from.getMonth() - 2, 1);
  }
  if (preset === '6months') {
    from.setMonth(from.getMonth() - 5, 1);
  }
  if (preset === 'year') {
    from.setMonth(0, 1);
  }
  return { from: dayStart(from), to: dayEnd(now) };
}
