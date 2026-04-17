/**
 * src/services/api.js
 * Configured Axios instance for all ShopEase API calls.
 * Automatically attaches JWT from Redux store to every request.
 * Implements automatic token refresh on 401 errors.
 * Handles CSRF token for state-changing requests.
 *
 * ✅ FIX: uses injectStore() pattern to break the circular dependency
 * without using require() (which is not available in Vite/ESM).
 *
 * Usage — call this once in store.js after the store is created:
 *   import { injectStore } from '../services/api';
 *   injectStore(store);
 */

import axios from 'axios';

// ── Store reference (injected after store is created) ──────
let _store = null;
const isNativeApp = () => {
  try {
    return !!window.Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
};

/**
 * Call this once from store.js immediately after configureStore().
 * This avoids the circular import:
 *   store.js → slices → api.js → store.js (💥)
 */
export const injectStore = (store) => {
  _store = store;
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
  withCredentials: true,
});

// ── CSRF Token Management ──────────────────────────────────
let csrfToken = null;

export const fetchCsrfToken = async () => {
  try {
    const response = await api.get('/csrf-token');
    csrfToken = response.data.csrfToken;
    return csrfToken;
  } catch (error) {
    console.warn('Failed to fetch CSRF token:', error.message);
    return null;
  }
};

export const getCsrfToken = async () => {
  if (!csrfToken) {
    await fetchCsrfToken();
  }
  return csrfToken;
};

// ── Track refresh state to prevent multiple refresh calls ──
let isRefreshing = false;
let failedQueue  = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else        prom.resolve(token);
  });
  failedQueue = [];
};

// ── Request interceptor: attach Bearer token + CSRF token ──
api.interceptors.request.use(
  async (config) => {
    const token = _store?.getState().auth.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (isNativeApp()) {
      config.headers['X-ShopEase-Client'] = 'capacitor';
    }

    const method = config.method?.toUpperCase();
    if (method && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      if (!csrfToken) {
        await fetchCsrfToken();
      }
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle errors ───────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status          = error.response?.status;

    // Handle CSRF token errors — refresh and retry
    if (status === 403 && error.response?.data?.code === 'CSRF_ERROR' && !originalRequest._csrfRetry) {
      originalRequest._csrfRetry = true;
      await fetchCsrfToken();
      if (csrfToken) {
        originalRequest.headers['X-CSRF-Token'] = csrfToken;
        return api(originalRequest);
      }
    }

    // If 401 and we have a refresh token, try to refresh
    if (status === 401 && !originalRequest._retry) {
      const refreshToken = _store?.getState().auth.refreshToken;

      if (!refreshToken || originalRequest.url === '/auth/refresh') {
        _store?.dispatch({ type: 'auth/logout' });
        return Promise.reject(new Error('Session expired. Please log in again.'));
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing            = true;

      try {
        const response = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          { refreshToken },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': csrfToken || '',
            },
            withCredentials: true,
          }
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        _store?.dispatch({
          type: 'auth/setTokens',
          payload: { accessToken, refreshToken: newRefreshToken },
        });

        processQueue(null, accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        _store?.dispatch({ type: 'auth/logout' });
        return Promise.reject(new Error('Session expired. Please log in again.'));
      } finally {
        isRefreshing = false;
      }
    }

    // Rate limit handling
    if (status === 429) {
      const retryAfter = error.response?.data?.retryAfter;
      const waitTime   = retryAfter ? `${Math.ceil(retryAfter / 60)} minute(s)` : 'a few minutes';
      return Promise.reject(new Error(`Too many requests. Please try again in ${waitTime}.`));
    }

    const message = error.response?.data?.message || error.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export default api;
