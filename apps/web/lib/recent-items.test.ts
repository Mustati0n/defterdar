import {
  mergeRecentItem,
  readRecentItems,
  recentItemHref,
  recentItemsKey,
  writeRecentItems,
  type RecentItem,
} from './recent-items';

describe('recent sidebar items', () => {
  const userId = 'user-1';
  const items: RecentItem[] = [
    { id: 'ledger-1', kind: 'ledger', name: 'BirOS', visitedAt: 10 },
    { id: 'plan-1', kind: 'plan', name: 'Yarın PC kontrol', visitedAt: 20 },
  ];

  beforeEach(() => window.localStorage.clear());

  it('stores entries per user and tolerates malformed storage', () => {
    writeRecentItems(userId, items);
    expect(readRecentItems(userId)).toEqual(items);
    expect(readRecentItems('user-2')).toEqual([]);

    window.localStorage.setItem(recentItemsKey(userId), '{not-json');
    expect(readRecentItems(userId)).toEqual([]);
  });

  it('moves a revisited item to the top and keeps at most five entries', () => {
    const initial = Array.from({ length: 5 }, (_, index): RecentItem => ({
      id: `ledger-${index}`,
      kind: 'ledger',
      name: `Defter ${index}`,
      visitedAt: index,
    }));
    const next = mergeRecentItem(initial, {
      id: 'ledger-1',
      kind: 'ledger',
      name: 'Yeni adı',
      visitedAt: 50,
    });

    expect(next).toHaveLength(5);
    expect(next[0]).toEqual(
      expect.objectContaining({ id: 'ledger-1', name: 'Yeni adı' }),
    );
    expect(next.filter((item) => item.id === 'ledger-1')).toHaveLength(1);
  });

  it('builds canonical detail links for each item kind', () => {
    expect(recentItemHref(items[0]!)).toBe('/ledgers/ledger-1');
    expect(recentItemHref(items[1]!)).toBe('/plans/plan-1');
  });
});
