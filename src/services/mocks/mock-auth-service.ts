/**
 * ⚠️ MOCK AUTH. Accepts any non-empty email and password and keeps the
 * session in memory only (it is lost on reload). Development use only.
 */
import { AppError } from '@/lib/errors';
import type { AuthService } from '@/services/auth/auth-service';
import type { AuthSession } from '@/types/auth';

import { MOCK_USER_ID } from './mock-data';
import { simulateLatency } from './mock-utils';

export function createMockAuthService(): AuthService {
  let session: AuthSession | null = null;
  const listeners = new Set<(session: AuthSession | null) => void>();
  const emit = () => listeners.forEach((listener) => listener(session));

  return {
    async restoreSession() {
      await simulateLatency(150);
      return session;
    },

    async signInWithPassword(email, password) {
      await simulateLatency();
      if (!email.trim() || !password) {
        throw new AppError('unauthorized', 'Mock mode: enter any email and password.');
      }
      session = { userId: MOCK_USER_ID, email: email.trim(), expiresAt: null };
      emit();
      return session;
    },

    async signOut() {
      await simulateLatency(150);
      session = null;
      emit();
    },

    onSessionChange(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    startAutoRefresh() {
      // Mock sessions never expire.
    },

    stopAutoRefresh() {
      // Mock sessions never expire.
    },
  };
}
