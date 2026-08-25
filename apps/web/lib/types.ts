export interface User {
  id: string;
  email: string;
  displayName: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse extends TokenResponse {
  user: User;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  displayName: string;
}

export type LedgerRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface Ledger {
  id: string;
  name: string;
  description: string | null;
  type: 'PERSONAL' | 'SHARED';
  currency: string;
  ownerId: string;
  role: LedgerRole;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  activeMemberCount?: number;
  activePlanCount?: number;
}

export interface CreateLedgerInput {
  name: string;
  description?: string | null;
  currency: string;
}

export type PlanStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

export interface Plan {
  id: string;
  ledgerId: string | null;
  scope: 'LEDGER' | 'STANDALONE';
  currency: string;
  name: string;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
  status: PlanStatus;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  participantCount: number;
}

export interface CreatePlanInput {
  name: string;
  description?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface CreateStandalonePlanInput extends CreatePlanInput {
  currency: string;
}

export interface PlanInvitation {
  id: string;
  invitedEmail: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface LedgerMember {
  user: Pick<User, 'id' | 'displayName'>;
  role: LedgerRole;
  joinedAt: string;
}

export interface LedgerInvitation {
  id: string;
  invitedEmail: string | null;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface CreatedLedgerInvitation {
  token: string;
  expiresAt: string;
}

export interface PlanParticipant {
  user: Pick<User, 'id' | 'displayName'>;
  createdAt: string;
}

export interface BalancePosition {
  user: Pick<User, 'id' | 'displayName'>;
  netMinor: number;
}

export interface BalanceResponse {
  currency: string;
  positions: BalancePosition[];
  suggestions: Array<{
    fromUserId: string;
    toUserId: string;
    amountMinor: number;
  }>;
}

export interface ActivityItem {
  id: string;
  ledgerId: string | null;
  planId?: string | null;
  actorUserId: string | null;
  actor: Pick<User, 'id' | 'displayName'> | null;
  entityType: string;
  entityId: string;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ActivityPage {
  items: ActivityItem[];
  nextCursor: string | null;
}

export interface OverviewResponse {
  ledgers: Ledger[];
  plans: Plan[];
  ledgerBalances: Array<{ ledgerId: string; balance: BalanceResponse }>;
  planBalances: Array<{ planId: string; balance: BalanceResponse }>;
  activity: ActivityPage | null;
}

export interface AnalyticsSummary {
  currency: string;
  totalExpenseMinor: string;
  totalIncomeMinor: string;
  netCashflowMinor: string;
  expenseCount: number;
  incomeCount: number;
  monthly: Array<{
    month: string;
    expenseMinor: string;
    incomeMinor: string;
  }>;
  byCategory: Array<{
    category: Pick<Category, 'id' | 'name'> | null;
    expenseMinor: string;
    incomeMinor: string;
  }>;
  paidByMember: Array<{
    user: Pick<User, 'id' | 'displayName'>;
    amountMinor: string;
  }>;
  shareByMember: Array<{
    user: Pick<User, 'id' | 'displayName'>;
    amountMinor: string;
  }>;
  currentBalances: BalanceResponse;
}

export type SplitMethod = 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES';

export interface ExpenseSplit {
  id: string;
  user: Pick<User, 'id' | 'displayName'>;
  amountMinor: string;
  isReimbursable: boolean;
  offsetAppliedMinor: string;
  remainingReimbursableMinor: string;
  offsets: ExpenseSplitOffset[];
  createdAt: string;
}

export interface ExpenseSplitOffset {
  id: string;
  expenseSplitId?: string;
  amountMinor: string;
  createdById: string;
  createdAt: string;
  voidedAt: string | null;
}

export interface OffsetAvailability {
  expenseSplitId: string;
  eligible: boolean;
  splitAmountMinor: string;
  offsetAppliedMinor: string;
  remainingReimbursableMinor: string;
  priorSuggestionMinor: string;
  maxOffsetMinor: string;
  reason: string | null;
}

export interface Settlement {
  id: string;
  ledgerId: string | null;
  planId: string | null;
  fromUserId: string;
  toUserId: string;
  fromUser: Pick<User, 'id' | 'displayName'>;
  toUser: Pick<User, 'id' | 'displayName'>;
  amountMinor: string;
  currency: string;
  note: string | null;
  settledAt: string;
  createdById: string;
  createdAt: string;
  voidedAt: string | null;
}

export interface CreateSettlementInput {
  fromUserId: string;
  toUserId: string;
  amountMinor: number;
  planId?: string | null;
  note?: string | null;
  settledAt: string;
}

export interface Expense {
  id: string;
  ledgerId: string | null;
  planId: string | null;
  categoryId: string | null;
  category: Category | null;
  createdById: string;
  payerId: string;
  payer: Pick<User, 'id' | 'displayName'>;
  title: string;
  description: string | null;
  amountMinor: string;
  currency: string;
  splitMethod: SplitMethod;
  isGift: boolean;
  expenseDate: string;
  voidedAt: string | null;
  version: number;
  attachmentCount?: number;
  accessRole?: LedgerRole | 'PLAN_CREATOR' | 'PARTICIPANT';
  ledgerArchivedAt?: string | null;
  planStatus?: PlanStatus | null;
  planCreatedById?: string | null;
  splits: ExpenseSplit[];
}

export type CategoryKind = 'EXPENSE' | 'INCOME' | 'BOTH';

export interface Category {
  id: string;
  ledgerId: string;
  name: string;
  kind: CategoryKind;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface ExpenseAttachment {
  id: string;
  expenseId: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  status: 'PENDING' | 'READY';
  createdById: string;
  createdAt: string;
  completedAt: string | null;
  deletedAt: string | null;
}

export interface CreateExpenseInput {
  title: string;
  description?: string | null;
  amountMinor: number;
  payerUserId: string;
  planId?: string | null;
  categoryId?: string | null;
  isGift: boolean;
  expenseDate: string;
  split: {
    method: SplitMethod;
    participantUserIds?: string[];
    entries?: Array<{
      userId: string;
      amountMinor?: number;
      percentageBps?: number;
      shares?: number;
    }>;
  };
}

export type UpdateExpenseInput = Partial<CreateExpenseInput> & {
  expectedVersion: number;
};

export interface Income {
  id: string;
  ledgerId: string | null;
  planId: string | null;
  categoryId: string | null;
  category: Category | null;
  createdById: string;
  title: string;
  description: string | null;
  amountMinor: string;
  currency: string;
  incomeDate: string;
  createdAt: string;
  updatedAt: string;
  voidedAt: string | null;
}

export interface CreateIncomeInput {
  title: string;
  description?: string | null;
  amountMinor: number;
  planId?: string | null;
  categoryId?: string | null;
  incomeDate: string;
}

export interface ApiErrorBody {
  statusCode?: number;
  message?: string | string[];
  path?: string;
  timestamp?: string;
}
