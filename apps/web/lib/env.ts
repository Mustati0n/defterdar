const defaultApiBaseUrl =
  process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001';

export const env = {
  apiBaseUrl: (
    process.env.NEXT_PUBLIC_API_BASE_URL ?? defaultApiBaseUrl
  ).replace(/\/$/, ''),
};
