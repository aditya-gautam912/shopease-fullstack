/**
 * src/services/authService.js
 * API calls for user authentication.
 * Supports access token + refresh token pattern.
 */

import api, { getCsrfToken } from './api';

export const authService = {
  /** Register a new user and return { accessToken, refreshToken, user } */
  register: async (data) => {
    await getCsrfToken();
    const res = await api.post('/auth/register', data);
    return res.data.data;
  },

  /** Login and return { accessToken, refreshToken, user } */
  login: async (data) => {
    await getCsrfToken();
    const res = await api.post('/auth/login', data);
    return res.data.data;
  },

  /** Logout and invalidate refresh token on server */
  logout: async (refreshToken) => {
    try {
      await getCsrfToken();
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // Ignore errors — user is logging out anyway
    }
  },

  /** Logout from all devices (requires auth) */
  logoutAll: async () => {
    await getCsrfToken();
    const res = await api.post('/auth/logout-all');
    return res.data;
  },

  /** Request password reset email */
  forgotPassword: async (email) => {
    await getCsrfToken();
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  },

  /** Reset password with token */
  resetPassword: async (token, password) => {
    await getCsrfToken();
    const res = await api.post(`/auth/reset-password/${token}`, { password });
    return res.data;
  },

  /** Verify email with token */
  verifyEmail: async (token) => {
    const res = await api.get(`/auth/verify-email/${token}`);
    return res.data;
  },

  /** Resend verification email (requires auth) */
  resendVerification: async () => {
    await getCsrfToken();
    const res = await api.post('/auth/resend-verification');
    return res.data;
  },
};
