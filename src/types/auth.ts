/**
 * The app-facing view of an authenticated session. Tokens stay inside the
 * Supabase client and are never exposed to UI code.
 */
export type AuthSession = {
  userId: string;
  email: string | null;
  /** Unix timestamp in seconds, when known. */
  expiresAt: number | null;
};
