import { env } from './env';
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  hasFreshAccessToken,
  setSession,
} from './session';
import type {
  ActivityPage,
  AnalyticsSummary,
  ApiErrorBody,
  AuthResponse,
  BalanceResponse,
  Category,
  CategoryKind,
  CreatedLedgerInvitation,
  CreateLedgerInput,
  CreateStandalonePlanInput,
  CreateExpenseInput,
  CreateIncomeInput,
  CreatePlanInput,
  Expense,
  ExpenseAttachment,
  ExpenseSplitOffset,
  Income,
  Ledger,
  LedgerMember,
  LedgerInvitation,
  LoginInput,
  Plan,
  PlanInvitation,
  PlanParticipant,
  OffsetAvailability,
  OverviewResponse,
  RegisterInput,
  TokenResponse,
  UpdateExpenseInput,
  User,
  Settlement,
  CreateSettlementInput,
} from './types';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: ApiErrorBody,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getErrorMessage(body: ApiErrorBody | null, status: number): string {
  const rawMessage = Array.isArray(body?.message)
    ? body.message.join(' ')
    : body?.message;
  const normalized = rawMessage?.toLocaleLowerCase('en-US') ?? '';

  if (normalized.includes('invalid credentials')) {
    return 'E-posta veya şifre doğru görünmüyor.';
  }
  if (normalized.includes('email is already registered')) {
    return 'Bu e-posta ile daha önce bir hesap açılmış.';
  }
  if (
    normalized.includes('category') &&
    (normalized.includes('already') || normalized.includes('duplicate'))
  ) {
    return 'Bu isimde bir kategori zaten var.';
  }
  if (normalized.includes('offset') && normalized.includes('mutation')) {
    return 'Bu harcamada Borçtan düş işlemi olduğu için paylaşımı şu anda değiştiremezsin. Önce ilgili Borçtan düş kaydını geri al.';
  }
  if (normalized.includes('version') && normalized.includes('match')) {
    return 'Bu harcama başka bir yerde güncellendi. Son halini yükleyip değişikliklerini yeniden uygula.';
  }
  if (normalized.includes('settlement exceeds')) {
    return 'Bu tutar kalan borçtan fazla.';
  }
  if (
    normalized.includes('fromuser is not a debtor') ||
    normalized.includes('touser is not a creditor') ||
    normalized.includes('concurrent financial')
  ) {
    return 'Bakiye az önce değişti. Güncel hesabı yeniden yükledik.';
  }
  if (normalized.includes('offset exceeds current availability')) {
    return 'Bu tutar artık Borçtan düşülebilecek miktardan fazla. Güncel durumu yeniden yükledik.';
  }
  if (
    normalized.includes('offset is not available') ||
    normalized.includes('no prior reverse debt') ||
    normalized.includes('split has no remaining')
  ) {
    return 'Bu harcama artık Borçtan düş için uygun değil. Bakiyeler değişmiş olabilir.';
  }
  if (
    normalized.includes('participant') &&
    normalized.includes('target ledger')
  ) {
    return 'Planı taşımadan önce tüm katılımcıları hedef Deftere üye yap.';
  }
  if (normalized.includes('archived') && normalized.includes('ledger')) {
    return 'Arşivdeki bir Deftere yeni kayıt eklenemez. Önce Defteri yeniden aç.';
  }
  if (normalized.includes('completed') && normalized.includes('plan')) {
    return 'Tamamlanmış bir Plana yeni kayıt eklenemez. Önce Planı yeniden aç.';
  }
  if (status === 409) {
    return 'Bu işlem mevcut kayıtlarla çakışıyor. Sayfayı yenileyip tekrar dene.';
  }
  if (rawMessage && status < 500 && status !== 400) return rawMessage;
  if (status === 400)
    return 'Bilgilerden biri eksik veya hatalı. İşaretli alanları kontrol et.';
  if (status === 401) return 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.';
  if (status === 403) return 'Bu işlemi yapma yetkin yok.';
  if (status === 404) return 'Aradığınız kayıt bulunamadı.';
  if (status >= 500) return 'Sunucuya ulaşılamadı. Biraz sonra tekrar deneyin.';
  return 'İstek tamamlanamadı.';
}

async function parseError(response: Response): Promise<ApiError> {
  let body: ApiErrorBody | null = null;
  try {
    body = (await response.json()) as ApiErrorBody;
  } catch {
    // A non-JSON proxy response still maps to a useful UI message.
  }
  return new ApiError(
    getErrorMessage(body, response.status),
    response.status,
    body ?? undefined,
  );
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(force = false): Promise<string | null> {
  if (!force && hasFreshAccessToken()) return getAccessToken();
  if (refreshPromise) return refreshPromise;

  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  refreshPromise = fetch(`${env.apiBaseUrl}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
    .then(async (response) => {
      if (!response.ok) throw await parseError(response);
      const tokens = (await response.json()) as TokenResponse;
      setSession(tokens);
      return tokens.accessToken;
    })
    .catch(() => {
      clearSession();
      return null;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  auth?: boolean;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
  retried = false,
): Promise<T> {
  const { auth = true, body, headers, ...requestInit } = options;
  let token = auth ? getAccessToken() : null;

  if (auth && !hasFreshAccessToken()) {
    token = await refreshAccessToken();
  }

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...requestInit,
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401 && auth && !retried) {
    const refreshedToken = await refreshAccessToken(true);
    if (refreshedToken) return apiRequest<T>(path, options, true);
  }

  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  auth: {
    login: (input: LoginInput) =>
      apiRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: input,
        auth: false,
      }),
    register: (input: RegisterInput) =>
      apiRequest<AuthResponse>('/auth/register', {
        method: 'POST',
        body: input,
        auth: false,
      }),
    logout: (refreshToken: string) =>
      apiRequest<void>('/auth/logout', {
        method: 'POST',
        body: { refreshToken },
        auth: false,
      }),
  },
  users: {
    me: (signal?: AbortSignal) => apiRequest<User>('/users/me', { signal }),
    update: (displayName: string) =>
      apiRequest<User>('/users/me', {
        method: 'PATCH',
        body: { displayName },
      }),
  },
  ledgers: {
    list: (includeArchived = false, signal?: AbortSignal) =>
      apiRequest<Ledger[]>(
        `/ledgers?includeArchived=${String(includeArchived)}`,
        { signal },
      ),
    get: (ledgerId: string, signal?: AbortSignal) =>
      apiRequest<Ledger>(`/ledgers/${ledgerId}`, { signal }),
    create: (input: CreateLedgerInput) =>
      apiRequest<Ledger>('/ledgers', { method: 'POST', body: input }),
    createPersonal: (input: CreateLedgerInput) =>
      apiRequest<Ledger>('/ledgers/personal', { method: 'POST', body: input }),
    update: (
      ledgerId: string,
      input: { name?: string; description?: string | null },
    ) =>
      apiRequest<Ledger>(`/ledgers/${ledgerId}`, {
        method: 'PATCH',
        body: input,
      }),
    archive: (ledgerId: string) =>
      apiRequest<Ledger>(`/ledgers/${ledgerId}/archive`, { method: 'POST' }),
    unarchive: (ledgerId: string) =>
      apiRequest<Ledger>(`/ledgers/${ledgerId}/unarchive`, { method: 'POST' }),
    leave: (ledgerId: string) =>
      apiRequest<void>(`/ledgers/${ledgerId}/leave`, { method: 'POST' }),
    transferOwnership: (ledgerId: string, newOwnerUserId: string) =>
      apiRequest<{
        ledgerId: string;
        previousOwnerUserId: string;
        newOwnerUserId: string;
      }>(`/ledgers/${ledgerId}/transfer-ownership`, {
        method: 'POST',
        body: { newOwnerUserId },
      }),
    members: (ledgerId: string, signal?: AbortSignal) =>
      apiRequest<LedgerMember[]>(`/ledgers/${ledgerId}/members`, { signal }),
    updateMemberRole: (
      ledgerId: string,
      userId: string,
      role: 'ADMIN' | 'MEMBER',
    ) =>
      apiRequest<LedgerMember>(`/ledgers/${ledgerId}/members/${userId}`, {
        method: 'PATCH',
        body: { role },
      }),
    removeMember: (ledgerId: string, userId: string) =>
      apiRequest<void>(`/ledgers/${ledgerId}/members/${userId}`, {
        method: 'DELETE',
      }),
    invitations: (ledgerId: string, signal?: AbortSignal) =>
      apiRequest<LedgerInvitation[]>(`/ledgers/${ledgerId}/invitations`, {
        signal,
      }),
    invite: (ledgerId: string, email?: string) =>
      apiRequest<CreatedLedgerInvitation>(`/ledgers/${ledgerId}/invitations`, {
        method: 'POST',
        body: email ? { email } : {},
      }),
    revokeInvitation: (ledgerId: string, invitationId: string) =>
      apiRequest<void>(`/ledgers/${ledgerId}/invitations/${invitationId}`, {
        method: 'DELETE',
      }),
    acceptInvitation: (token: string) =>
      apiRequest<{ ledgerId: string; role: 'MEMBER' }>(
        `/invitations/${encodeURIComponent(token)}/accept`,
        {
          method: 'POST',
        },
      ),
    balances: (ledgerId: string, signal?: AbortSignal) =>
      apiRequest<BalanceResponse>(`/ledgers/${ledgerId}/balances`, { signal }),
    activity: (
      ledgerId: string,
      limit = 12,
      cursor?: string,
      planId?: string,
      signal?: AbortSignal,
    ) => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (cursor) params.set('cursor', cursor);
      if (planId) params.set('planId', planId);
      return apiRequest<ActivityPage>(
        `/ledgers/${ledgerId}/activity?${params.toString()}`,
        { signal },
      );
    },
    analytics: (
      ledgerId: string,
      from?: string,
      to?: string,
      signal?: AbortSignal,
    ) => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const query = params.size ? `?${params.toString()}` : '';
      return apiRequest<AnalyticsSummary>(
        `/ledgers/${ledgerId}/analytics/summary${query}`,
        { signal },
      );
    },
  },
  plans: {
    list: (ledgerId: string, includeArchived = false, signal?: AbortSignal) =>
      apiRequest<Plan[]>(
        `/ledgers/${ledgerId}/plans?includeArchived=${String(includeArchived)}`,
        { signal },
      ),
    listAll: (includeArchived = false, signal?: AbortSignal) =>
      apiRequest<Plan[]>(`/plans?includeArchived=${String(includeArchived)}`, {
        signal,
      }),
    get: (planId: string, signal?: AbortSignal) =>
      apiRequest<Plan>(`/plans/${planId}`, { signal }),
    create: (ledgerId: string, input: CreatePlanInput) =>
      apiRequest<Plan>(`/ledgers/${ledgerId}/plans`, {
        method: 'POST',
        body: input,
      }),
    createStandalone: (input: CreateStandalonePlanInput) =>
      apiRequest<Plan>('/plans', { method: 'POST', body: input }),
    update: (planId: string, input: Partial<CreatePlanInput>) =>
      apiRequest<Plan>(`/plans/${planId}`, { method: 'PATCH', body: input }),
    complete: (planId: string) =>
      apiRequest<Plan>(`/plans/${planId}/complete`, { method: 'POST' }),
    reopen: (planId: string) =>
      apiRequest<Plan>(`/plans/${planId}/reopen`, { method: 'POST' }),
    archive: (planId: string) =>
      apiRequest<Plan>(`/plans/${planId}/archive`, { method: 'POST' }),
    unarchive: (planId: string) =>
      apiRequest<Plan>(`/plans/${planId}/unarchive`, { method: 'POST' }),
    participants: (planId: string, signal?: AbortSignal) =>
      apiRequest<PlanParticipant[]>(`/plans/${planId}/participants`, {
        signal,
      }),
    addParticipant: (planId: string, userId: string) =>
      apiRequest<PlanParticipant>(`/plans/${planId}/participants`, {
        method: 'POST',
        body: { userId },
      }),
    removeParticipant: (planId: string, userId: string) =>
      apiRequest<void>(`/plans/${planId}/participants/${userId}`, {
        method: 'DELETE',
      }),
    move: (planId: string, targetLedgerId: string) =>
      apiRequest<Plan>(`/plans/${planId}/move`, {
        method: 'POST',
        body: { targetLedgerId },
      }),
    linkLedger: (planId: string, ledgerId: string) =>
      apiRequest<Plan>(`/plans/${planId}/link-ledger`, {
        method: 'POST',
        body: { ledgerId },
      }),
    invitations: (planId: string, signal?: AbortSignal) =>
      apiRequest<PlanInvitation[]>(`/plans/${planId}/invitations`, {
        signal,
      }),
    invite: (planId: string, email: string) =>
      apiRequest<{ token: string; expiresAt: string }>(
        `/plans/${planId}/invitations`,
        { method: 'POST', body: { email } },
      ),
    revokeInvitation: (planId: string, invitationId: string) =>
      apiRequest<void>(`/plans/${planId}/invitations/${invitationId}`, {
        method: 'DELETE',
      }),
    acceptInvitation: (token: string) =>
      apiRequest<{ planId: string }>(
        `/plan-invitations/${encodeURIComponent(token)}/accept`,
        { method: 'POST' },
      ),
    balances: (planId: string, signal?: AbortSignal) =>
      apiRequest<BalanceResponse>(`/plans/${planId}/balances`, { signal }),
    analytics: (
      planId: string,
      from?: string,
      to?: string,
      signal?: AbortSignal,
    ) => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const query = params.size ? `?${params.toString()}` : '';
      return apiRequest<AnalyticsSummary>(
        `/plans/${planId}/analytics/summary${query}`,
        { signal },
      );
    },
    activity: (
      planId: string,
      limit = 20,
      cursor?: string,
      signal?: AbortSignal,
    ) => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (cursor) params.set('cursor', cursor);
      return apiRequest<ActivityPage>(
        `/plans/${planId}/activity?${params.toString()}`,
        { signal },
      );
    },
  },
  expenses: {
    list: (ledgerId: string, planId?: string, signal?: AbortSignal) =>
      apiRequest<Expense[]>(
        `/ledgers/${ledgerId}/expenses${planId ? `?planId=${planId}` : ''}`,
        { signal },
      ),
    create: (ledgerId: string, input: CreateExpenseInput) =>
      apiRequest<Expense>(`/ledgers/${ledgerId}/expenses`, {
        method: 'POST',
        body: input,
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      }),
    listForPlan: (planId: string, signal?: AbortSignal) =>
      apiRequest<Expense[]>(`/plans/${planId}/expenses`, { signal }),
    createForPlan: (planId: string, input: CreateExpenseInput) =>
      apiRequest<Expense>(`/plans/${planId}/expenses`, {
        method: 'POST',
        body: input,
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      }),
    get: (expenseId: string, signal?: AbortSignal) =>
      apiRequest<Expense>(`/expenses/${expenseId}`, { signal }),
    update: (expenseId: string, input: UpdateExpenseInput) =>
      apiRequest<Expense>(`/expenses/${expenseId}`, {
        method: 'PATCH',
        body: input,
      }),
    void: (expenseId: string) =>
      apiRequest<Expense>(`/expenses/${expenseId}/void`, { method: 'POST' }),
    attachments: (expenseId: string, signal?: AbortSignal) =>
      apiRequest<ExpenseAttachment[]>(`/expenses/${expenseId}/attachments`, {
        signal,
      }),
    reserveAttachment: (
      expenseId: string,
      input: { fileName: string; mimeType: string; sizeBytes: number },
    ) =>
      apiRequest<{
        attachmentId: string;
        uploadUrl: string;
        expiresAt: string;
      }>(`/expenses/${expenseId}/attachments`, { method: 'POST', body: input }),
  },
  attachments: {
    complete: (attachmentId: string) =>
      apiRequest<ExpenseAttachment>(`/attachments/${attachmentId}/complete`, {
        method: 'POST',
      }),
    url: (attachmentId: string) =>
      apiRequest<{ url: string; expiresAt: string }>(
        `/attachments/${attachmentId}/url`,
      ),
    remove: (attachmentId: string) =>
      apiRequest<void>(`/attachments/${attachmentId}`, { method: 'DELETE' }),
  },
  settlements: {
    list: (ledgerId: string, planId?: string, signal?: AbortSignal) =>
      apiRequest<Settlement[]>(
        `/ledgers/${ledgerId}/settlements${planId ? `?planId=${encodeURIComponent(planId)}` : ''}`,
        { signal },
      ),
    create: (ledgerId: string, input: CreateSettlementInput) =>
      apiRequest<Settlement>(`/ledgers/${ledgerId}/settlements`, {
        method: 'POST',
        body: input,
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      }),
    listForPlan: (planId: string, signal?: AbortSignal) =>
      apiRequest<Settlement[]>(`/plans/${planId}/settlements`, { signal }),
    createForPlan: (planId: string, input: CreateSettlementInput) =>
      apiRequest<Settlement>(`/plans/${planId}/settlements`, {
        method: 'POST',
        body: input,
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      }),
    void: (settlementId: string) =>
      apiRequest<Settlement>(`/settlements/${settlementId}/void`, {
        method: 'POST',
      }),
  },
  offsets: {
    availability: (expenseSplitId: string, signal?: AbortSignal) =>
      apiRequest<OffsetAvailability>(
        `/expense-splits/${expenseSplitId}/offset-availability`,
        { signal },
      ),
    create: (expenseSplitId: string, amountMinor?: number) =>
      apiRequest<ExpenseSplitOffset>(
        `/expense-splits/${expenseSplitId}/offsets`,
        {
          method: 'POST',
          body: amountMinor === undefined ? {} : { amountMinor },
          headers: { 'Idempotency-Key': crypto.randomUUID() },
        },
      ),
    void: (offsetId: string) =>
      apiRequest<ExpenseSplitOffset>(
        `/expense-split-offsets/${offsetId}/void`,
        { method: 'POST' },
      ),
  },
  categories: {
    list: (ledgerId: string, signal?: AbortSignal) =>
      apiRequest<Category[]>(`/ledgers/${ledgerId}/categories`, { signal }),
    create: (ledgerId: string, input: { name: string; kind: CategoryKind }) =>
      apiRequest<Category>(`/ledgers/${ledgerId}/categories`, {
        method: 'POST',
        body: input,
      }),
    update: (
      categoryId: string,
      input: { name?: string; kind?: CategoryKind },
    ) =>
      apiRequest<Category>(`/categories/${categoryId}`, {
        method: 'PATCH',
        body: input,
      }),
    archive: (categoryId: string) =>
      apiRequest<Category>(`/categories/${categoryId}/archive`, {
        method: 'POST',
      }),
  },
  incomes: {
    list: (ledgerId: string, planId?: string, signal?: AbortSignal) =>
      apiRequest<Income[]>(
        `/ledgers/${ledgerId}/incomes${planId ? `?planId=${planId}` : ''}`,
        { signal },
      ),
    create: (ledgerId: string, input: CreateIncomeInput) =>
      apiRequest<Income>(`/ledgers/${ledgerId}/incomes`, {
        method: 'POST',
        body: input,
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      }),
    listForPlan: (planId: string, signal?: AbortSignal) =>
      apiRequest<Income[]>(`/plans/${planId}/incomes`, { signal }),
    createForPlan: (planId: string, input: CreateIncomeInput) =>
      apiRequest<Income>(`/plans/${planId}/incomes`, {
        method: 'POST',
        body: input,
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      }),
    get: (incomeId: string, signal?: AbortSignal) =>
      apiRequest<Income>(`/incomes/${incomeId}`, { signal }),
    update: (incomeId: string, input: Partial<CreateIncomeInput>) =>
      apiRequest<Income>(`/incomes/${incomeId}`, {
        method: 'PATCH',
        body: input,
      }),
    void: (incomeId: string) =>
      apiRequest<Income>(`/incomes/${incomeId}/void`, { method: 'POST' }),
  },
  overview: {
    get: (signal?: AbortSignal) =>
      apiRequest<OverviewResponse>('/overview', { signal }),
  },
};
