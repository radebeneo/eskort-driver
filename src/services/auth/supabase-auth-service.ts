import {
  isAuthRetryableFetchError,
  type AuthError,
  type Session,
  type SupabaseClient,
} from '@supabase/supabase-js';

import { AppError, appErrorMessages } from '@/lib/errors';
import type { AuthSession } from '@/types/auth';

import type { AuthService } from './auth-service';

function toAuthSession(session: Session): AuthSession {
  return {
    userId: session.user.id,
    email: session.user.email ?? null,
    expiresAt: session.expires_at ?? null,
  };
}

function toSignInError(error: AuthError): AppError {
  if (isAuthRetryableFetchError(error)) {
    return new AppError('network', appErrorMessages.network, error);
  }
  if (error.code === 'invalid_credentials') {
    return new AppError('unauthorized', 'Incorrect email or password.', error);
  }
  if (error.code === 'email_not_confirmed') {
    return new AppError(
      'unauthorized',
      'Please confirm your email address before signing in.',
      error,
    );
  }
  if (error.code === 'user_banned') {
    return new AppError(
      'forbidden',
      'This account has been disabled. Contact your dispatcher.',
      error,
    );
  }
  return new AppError('unknown', 'Sign-in failed. Please try again.', error);
}

export function createSupabaseAuthService(client: SupabaseClient): AuthService {
  return {
    async restoreSession() {
      const { data, error } = await client.auth.getSession();
      if (error || !data.session) return null;

      // getSession() only reads local storage. Verify the JWT before trusting it.
      const { data: claimsData, error: claimsError } = await client.auth.getClaims();
      if (claimsError) {
        // Offline: keep the cached session. Row Level Security still enforces
        // access server-side once the device reconnects.
        if (isAuthRetryableFetchError(claimsError)) return toAuthSession(data.session);
        await client.auth.signOut({ scope: 'local' });
        return null;
      }
      if (!claimsData || claimsData.claims.sub !== data.session.user.id) {
        await client.auth.signOut({ scope: 'local' });
        return null;
      }
      return toAuthSession(data.session);
    },

    async signInWithPassword(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw toSignInError(error);
      return toAuthSession(data.session);
    },

    async signOut() {
      const { error } = await client.auth.signOut();
      // If the server cannot be reached, still clear the local session.
      if (error) await client.auth.signOut({ scope: 'local' });
    },

    onSessionChange(listener) {
      const { data } = client.auth.onAuthStateChange((event, session) => {
        // The initial session is handled (and verified) by restoreSession().
        if (event === 'INITIAL_SESSION') return;
        listener(session ? toAuthSession(session) : null);
      });
      return () => data.subscription.unsubscribe();
    },

    startAutoRefresh() {
      void client.auth.startAutoRefresh();
    },

    stopAutoRefresh() {
      void client.auth.stopAutoRefresh();
    },
  };
}
