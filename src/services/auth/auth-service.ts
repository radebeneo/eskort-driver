import type { AuthSession } from '@/types/auth';

export interface AuthService {
  /** Restores a persisted session at launch. Resolves null when signed out. */
  restoreSession(): Promise<AuthSession | null>;
  /** Throws an `AppError` with a driver-friendly message on failure. */
  signInWithPassword(email: string, password: string): Promise<AuthSession>;
  signOut(): Promise<void>;
  /** Notifies about sign-in, sign-out and token refresh after launch. Returns an unsubscribe function. */
  onSessionChange(listener: (session: AuthSession | null) => void): () => void;
  /** Called while the app is in the foreground. */
  startAutoRefresh(): void;
  stopAutoRefresh(): void;
}
