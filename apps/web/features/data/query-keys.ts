export const queryKeys = {
  me: ['me'] as const,
  overview: ['overview'] as const,
  ledgersRoot: ['ledgers'] as const,
  ledgers: (includeArchived = false) =>
    ['ledgers', { includeArchived }] as const,
  ledger: (id: string) => ['ledger', id] as const,
  plansRoot: ['plans'] as const,
  plans: (ledgerId: string, includeArchived = false) =>
    ['plans', ledgerId, { includeArchived }] as const,
  plansPrefix: (ledgerId: string) => ['plans', ledgerId] as const,
  allPlans: (includeArchived = false) =>
    ['plans', 'all', { includeArchived }] as const,
  plan: (id: string) => ['plan', id] as const,
  members: (ledgerId: string) => ['members', ledgerId] as const,
  participants: (planId: string) => ['participants', planId] as const,
  ledgerBalance: (ledgerId: string) => ['ledger-balance', ledgerId] as const,
  planBalance: (planId: string) => ['plan-balance', planId] as const,
  activityPreview: (ledgerId: string) =>
    ['activity-preview', ledgerId] as const,
  activityFeed: (ledgerId: string, planId?: string) =>
    ['activity-feed', ledgerId, { planId }] as const,
  activityFeedPrefix: (ledgerId: string) =>
    ['activity-feed', ledgerId] as const,
  planActivity: (planId: string) => ['plan-activity', planId] as const,
  ledgerAnalyticsPrefix: (ledgerId: string) =>
    ['ledger-analytics', ledgerId] as const,
  ledgerAnalytics: (ledgerId: string, from?: string, to?: string) =>
    ['ledger-analytics', ledgerId, { from, to }] as const,
  planAnalyticsPrefix: (planId: string) => ['plan-analytics', planId] as const,
  planAnalyticsRoot: ['plan-analytics'] as const,
  planAnalytics: (planId: string, from?: string, to?: string) =>
    ['plan-analytics', planId, { from, to }] as const,
  expenses: (ledgerId: string, planId?: string) =>
    ['expenses', ledgerId, { planId }] as const,
  expensesPrefix: (ledgerId: string) => ['expenses', ledgerId] as const,
  planExpenses: (planId: string) => ['plan-expenses', planId] as const,
  expense: (expenseId: string) => ['expense', expenseId] as const,
  attachments: (expenseId: string) => ['attachments', expenseId] as const,
  categories: (ledgerId: string) => ['categories', ledgerId] as const,
  incomes: (ledgerId: string, planId?: string) =>
    ['incomes', ledgerId, { planId }] as const,
  incomesPrefix: (ledgerId: string) => ['incomes', ledgerId] as const,
  planIncomes: (planId: string) => ['plan-incomes', planId] as const,
  income: (incomeId: string) => ['income', incomeId] as const,
  invitations: (ledgerId: string) => ['invitations', ledgerId] as const,
  planInvitations: (planId: string) => ['plan-invitations', planId] as const,
  settlements: (ledgerId: string, planId?: string) =>
    ['settlements', ledgerId, { planId }] as const,
  settlementsPrefix: (ledgerId: string) => ['settlements', ledgerId] as const,
  planSettlements: (planId: string) => ['plan-settlements', planId] as const,
  offsetAvailability: (ledgerId: string, expenseSplitId: string) =>
    ['offset-availability', ledgerId, expenseSplitId] as const,
  offsetAvailabilityPrefix: (ledgerId: string) =>
    ['offset-availability', ledgerId] as const,
  planOffsetAvailabilityPrefix: (planId: string) =>
    ['offset-availability', `plan:${planId}`] as const,
};
