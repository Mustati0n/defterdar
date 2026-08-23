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
}

export interface CreateLedgerInput {
  name: string;
  description?: string | null;
  currency: string;
}

export type PlanStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

export interface Plan {
  id: string;
  ledgerId: string;
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

export interface LedgerMember {
  user: Pick<User, 'id' | 'displayName'>;
  role: LedgerRole;
  joinedAt: string;
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
  ledgerId: string;
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
  createdAt: string;
}

export interface Expense {
  id: string;
  ledgerId: string;
  planId: string | null;
  categoryId: string | null;
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
  splits: ExpenseSplit[];
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

export interface Income {
  id: string;
  ledgerId: string;
  planId: string | null;
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
