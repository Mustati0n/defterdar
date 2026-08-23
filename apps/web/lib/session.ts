import type { TokenResponse } from './types';

const REFRESH_TOKEN_KEY = 'defterdar.refresh-token.v1';

let accessToken: string | null = null;
let accessTokenExpiresAt = 0;

export function getAccessToken(): string | null {
  return accessToken;
}

export function hasFreshAccessToken(): boolean {
  return Boolean(accessToken && Date.now() < accessTokenExpiresAt - 15_000);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function hasPersistedSession(): boolean {
  return Boolean(getRefreshToken());
}

export function setSession(tokens: TokenResponse): void {
  accessToken = tokens.accessToken;
  accessTokenExpiresAt = Date.now() + tokens.expiresIn * 1_000;

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }
}

export function clearSession(): void {
  accessToken = null;
  accessTokenExpiresAt = 0;

  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}
