export type QuickActionKind = 'expense' | 'income' | 'plan' | 'ledger';

export interface QuickActionContext {
  ledgerId?: string;
  planId?: string;
}

export function getQuickActionContext(
  pathname: string,
  planLedgerId?: string,
): QuickActionContext {
  const ledgerMatch = pathname.match(/^\/ledgers\/([^/]+)/);
  if (ledgerMatch?.[1]) return { ledgerId: ledgerMatch[1] };

  const planMatch = pathname.match(/^\/plans\/([^/]+)/);
  if (planMatch?.[1]) {
    return { ledgerId: planLedgerId, planId: planMatch[1] };
  }
  return {};
}

export function buildQuickActionHref(
  kind: QuickActionKind,
  context: QuickActionContext,
): string {
  if (kind === 'ledger') return '/ledgers?create=1';

  const params = new URLSearchParams();
  if (context.ledgerId) params.set('ledgerId', context.ledgerId);
  if (context.planId && kind !== 'plan') params.set('planId', context.planId);
  const query = params.size ? `?${params.toString()}` : '';

  if (kind === 'plan')
    return `/plans?create=1${query ? `&${params.toString()}` : ''}`;
  if (kind === 'expense') return `/expenses/new${query}`;
  return `/incomes/new${query}`;
}
