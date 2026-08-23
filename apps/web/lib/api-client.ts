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
  CreateLedgerInput,
  CreateExpenseInput,
  CreateIncomeInput,
  CreatePlanInput,
  Expense,
  Income,
  Ledger,
  LedgerMember,
  LoginInput,
  Plan,
  PlanParticipant,
  RegisterInput,
  TokenResponse,
  User,
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
  if (normalized.includes('offset') && normalized.includes('mutation')) {
    return 'Bu harcamada Borçtan düş işlemi olduğu için paylaşımı şu anda değiştiremezsin. Önce ilgili Borçtan düş kaydını geri al.';
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
  if (status === 403) return 'Bu işlem için yetkiniz bulunmuyor.';
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
    me: () => apiRequest<User>('/users/me'),
  },
  ledgers: {
    list: (includeArchived = false) =>
      apiRequest<Ledger[]>(
        `/ledgers?includeArchived=${String(includeArchived)}`,
      ),
    get: (ledgerId: string) => apiRequest<Ledger>(`/ledgers/${ledgerId}`),
    create: (input: CreateLedgerInput) =>
      apiRequest<Ledger>('/ledgers', { method: 'POST', body: input }),
    members: (ledgerId: string) =>
      apiRequest<LedgerMember[]>(`/ledgers/${ledgerId}/members`),
    balances: (ledgerId: string) =>
      apiRequest<BalanceResponse>(`/ledgers/${ledgerId}/balances`),
    activity: (ledgerId: string, limit = 12) =>
      apiRequest<ActivityPage>(`/ledgers/${ledgerId}/activity?limit=${limit}`),
    analytics: (ledgerId: string) =>
      apiRequest<AnalyticsSummary>(`/ledgers/${ledgerId}/analytics/summary`),
  },
  plans: {
    list: (ledgerId: string, includeArchived = false) =>
      apiRequest<Plan[]>(
        `/ledgers/${ledgerId}/plans?includeArchived=${String(includeArchived)}`,
      ),
    get: (planId: string) => apiRequest<Plan>(`/plans/${planId}`),
    create: (ledgerId: string, input: CreatePlanInput) =>
      apiRequest<Plan>(`/ledgers/${ledgerId}/plans`, {
        method: 'POST',
        body: input,
      }),
    participants: (planId: string) =>
      apiRequest<PlanParticipant[]>(`/plans/${planId}/participants`),
    balances: (planId: string) =>
      apiRequest<BalanceResponse>(`/plans/${planId}/balances`),
    analytics: (planId: string) =>
      apiRequest<AnalyticsSummary>(`/plans/${planId}/analytics/summary`),
  },
  expenses: {
    list: (ledgerId: string, planId?: string) =>
      apiRequest<Expense[]>(
        `/ledgers/${ledgerId}/expenses${planId ? `?planId=${planId}` : ''}`,
      ),
    create: (ledgerId: string, input: CreateExpenseInput) =>
      apiRequest<Expense>(`/ledgers/${ledgerId}/expenses`, {
        method: 'POST',
        body: input,
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      }),
  },
  incomes: {
    create: (ledgerId: string, input: CreateIncomeInput) =>
      apiRequest<Income>(`/ledgers/${ledgerId}/incomes`, {
        method: 'POST',
        body: input,
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      }),
  },
};
