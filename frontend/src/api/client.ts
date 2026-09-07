import axios from 'axios';

// In dev, Vite proxies /api → backend. In prod, set VITE_API_URL to the API origin.
const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

export const api = axios.create({ baseURL });

const TOKEN_KEY = 'defautheque_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// Attach the admin JWT when present.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, drop the stale token so guards redirect to login.
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) clearToken();
    return Promise.reject(error);
  },
);

// Resolve an image path returned by the API to a URL the browser can load.
export function imageUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//.test(path)) return path;
  const origin = import.meta.env.VITE_API_URL ?? '';
  return `${origin}${path}`;
}

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? error.message;
  }
  return 'Unexpected error';
}
