export type RecentItemKind = 'ledger' | 'plan';

export interface RecentItem {
  id: string;
  kind: RecentItemKind;
  name: string;
  visitedAt: number;
}

const MAX_RECENT_ITEMS = 5;
const recentItemsEvent = 'defterdar:recent-items';
const cache = new Map<string, { raw: string | null; items: RecentItem[] }>();
export const emptyRecentItems: RecentItem[] = [];

export function recentItemsKey(userId: string) {
  return `defterdar:recent-items:v1:${userId}`;
}

export function recentItemHref(item: Pick<RecentItem, 'id' | 'kind'>) {
  return item.kind === 'ledger' ? `/ledgers/${item.id}` : `/plans/${item.id}`;
}

function isRecentItem(value: unknown): value is RecentItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<RecentItem>;
  return (
    typeof item.id === 'string' &&
    (item.kind === 'ledger' || item.kind === 'plan') &&
    typeof item.name === 'string' &&
    typeof item.visitedAt === 'number'
  );
}

export function readRecentItems(userId: string): RecentItem[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(recentItemsKey(userId));
  const cached = cache.get(userId);
  if (cached?.raw === raw) return cached.items;
  try {
    if (!raw) {
      cache.set(userId, { raw, items: emptyRecentItems });
      return emptyRecentItems;
    }
    const parsed: unknown = JSON.parse(raw);
    const items = Array.isArray(parsed)
      ? parsed.filter(isRecentItem).slice(0, MAX_RECENT_ITEMS)
      : [];
    cache.set(userId, { raw, items });
    return items;
  } catch {
    cache.set(userId, { raw, items: emptyRecentItems });
    return emptyRecentItems;
  }
}

export function mergeRecentItem(
  current: readonly RecentItem[],
  item: RecentItem,
): RecentItem[] {
  return [
    item,
    ...current.filter(
      (candidate) => candidate.id !== item.id || candidate.kind !== item.kind,
    ),
  ]
    .sort((left, right) => right.visitedAt - left.visitedAt)
    .slice(0, MAX_RECENT_ITEMS);
}

export function writeRecentItems(userId: string, items: RecentItem[]) {
  if (typeof window === 'undefined') return;
  const next = items.slice(0, MAX_RECENT_ITEMS);
  const raw = JSON.stringify(next);
  window.localStorage.setItem(recentItemsKey(userId), raw);
  cache.set(userId, { raw, items: next });
  window.dispatchEvent(
    new CustomEvent(recentItemsEvent, { detail: { userId } }),
  );
}

export function subscribeToRecentItems(userId: string, callback: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  const handleLocalUpdate = (event: Event) => {
    if (
      event instanceof CustomEvent &&
      (event.detail as { userId?: string } | null)?.userId === userId
    ) {
      callback();
    }
  };
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== recentItemsKey(userId)) return;
    cache.delete(userId);
    callback();
  };
  window.addEventListener(recentItemsEvent, handleLocalUpdate);
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener(recentItemsEvent, handleLocalUpdate);
    window.removeEventListener('storage', handleStorage);
  };
}
