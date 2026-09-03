import * as SecureStore from 'expo-secure-store';
import { firebaseAuth } from '@/src/auth/firebase';

const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? 'https://blackportfolio-api-production.up.railway.app/api').replace(/\/$/, '');
const TWO_FACTOR_KEY = 'bp.mobile.2fa.session';

export type ApiPortfolio = {
  id: string;
  name: string;
  currency?: string;
  cashBalance?: number;
  positions?: Array<{ ticker: string; name?: string; quantity?: number; averagePrice?: number }>;
};

export type Bootstrap = {
  user: { id: string; email: string; displayName?: string; plan?: string };
  portfolios: ApiPortfolio[] | null;
  portfolioVersion: number;
};

type ApiError = Error & { code?: string; status?: number };

export async function setTwoFactorToken(token: string) {
  await SecureStore.setItemAsync(TWO_FACTOR_KEY, token, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
}

export async function clearTwoFactorToken() {
  await SecureStore.deleteItemAsync(TWO_FACTOR_KEY);
}

export async function hasTwoFactorToken() {
  return Boolean(await SecureStore.getItemAsync(TWO_FACTOR_KEY));
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('No hay una sesión autenticada.');
  const [idToken, twoFactorToken] = await Promise.all([user.getIdToken(), SecureStore.getItemAsync(TWO_FACTOR_KEY)]);
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
      ...(twoFactorToken ? { 'X-2FA-Token': twoFactorToken } : {}),
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error: ApiError = new Error(payload.detail ?? `Error de red (${response.status}).`);
    error.status = response.status;
    error.code = payload.detail;
    if (payload.detail === '2fa_required') await clearTwoFactorToken();
    throw error;
  }
  return payload as T;
}

export const accountApi = {
  bootstrap: () => request<Bootstrap>('/account/bootstrap'),
  savePortfolios: (portfolios: ApiPortfolio[]) => request('/account/portfolios', {
    method: 'PUT', body: JSON.stringify({ portfolios, source: 'mobile_beta' }),
  }),
  twoFactorStatus: () => request<{ enabled: boolean }>('/2fa/status'),
  verifyTwoFactor: (code: string) => request<{ valid: boolean; token?: string }>('/2fa/verify', {
    method: 'POST', body: JSON.stringify({ code }),
  }),
};

export const marketApi = {
  search: (query: string) => request<Array<{ symbol: string; name?: string; type?: string }>>(`/search?q=${encodeURIComponent(query)}`),
  chart: (symbol: string, range = '1mo', interval = '1d') => request<{ points?: Array<{ close: number; date?: string }> }>(`/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`),
};
