import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Platform } from 'react-native';

import { AppError, toAppError } from '@/lib/errors';
import { useServices } from '@/providers/services-provider';
import { useDeliverySelectionStore } from '@/stores/delivery-selection-store';
import type { AuthSession } from '@/types/auth';
import type { DriverProfile } from '@/types/driver';

export type AuthStatus = 'initializing' | 'signedOut' | 'signedIn';

export type DriverProfileState =
  | { status: 'loading' }
  | { status: 'ready'; driver: DriverProfile }
  | { status: 'error'; error: AppError };

export type AuthContextValue = {
  status: AuthStatus;
  session: AuthSession | null;
  /** The authenticated driver's profile. Only meaningful while signed in. */
  driverProfile: DriverProfileState;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  reloadDriverProfile: () => void;
};

type DriverProfileEntry = {
  userId: string;
  reloadToken: number;
  state: Exclude<DriverProfileState, { status: 'loading' }>;
};

const LOADING_PROFILE: DriverProfileState = { status: 'loading' };

const AuthContext = createContext<AuthContextValue | null>(null);

/** Operational (Zustand) state that must not survive a sign-out. */
function clearOperationalState() {
  useDeliverySelectionStore.getState().clearSelection();
}

/**
 * Owns the auth/session lifecycle and the authenticated driver profile.
 * Other code reads auth state through `useAuth()`; it is never copied into Zustand.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { auth, drivers } = useServices();
  const [isRestoring, setIsRestoring] = useState(true);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [driverEntry, setDriverEntry] = useState<DriverProfileEntry | null>(null);
  const [driverReloadToken, setDriverReloadToken] = useState(0);

  // Restore the persisted session, then follow sign-in, sign-out and refresh events.
  useEffect(() => {
    let active = true;
    const unsubscribe = auth.onSessionChange((next) => {
      if (!active) return;
      setSession(next);
      if (!next) clearOperationalState();
    });

    auth
      .restoreSession()
      .then(
        (restored) => {
          if (active) setSession((current) => current ?? restored);
        },
        () => {
          // A failed restore is treated as signed out.
        },
      )
      .finally(() => {
        if (active) setIsRestoring(false);
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [auth]);

  // Refresh tokens only while the app is in the foreground.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (AppState.currentState === 'active') auth.startAutoRefresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') auth.startAutoRefresh();
      else auth.stopAutoRefresh();
    });
    return () => {
      subscription.remove();
      auth.stopAutoRefresh();
    };
  }, [auth]);

  // Load the driver profile whenever the signed-in user changes.
  const userId = session?.userId ?? null;
  useEffect(() => {
    if (!userId) return;
    let active = true;
    const reloadToken = driverReloadToken;
    drivers.getByUserId(userId).then(
      (driver) => {
        if (!active) return;
        setDriverEntry({
          userId,
          reloadToken,
          state: driver
            ? { status: 'ready', driver }
            : {
                status: 'error',
                error: new AppError(
                  'not_found',
                  'No driver profile is linked to this account. Contact your dispatcher.',
                ),
              },
        });
      },
      (error: unknown) => {
        if (!active) return;
        setDriverEntry({
          userId,
          reloadToken,
          state: {
            status: 'error',
            error: toAppError(error, 'We could not load your driver profile.'),
          },
        });
      },
    );
    return () => {
      active = false;
    };
  }, [drivers, userId, driverReloadToken]);

  // The profile is only current when it belongs to this user and reload request.
  const driverProfile: DriverProfileState =
    driverEntry && driverEntry.userId === userId && driverEntry.reloadToken === driverReloadToken
      ? driverEntry.state
      : LOADING_PROFILE;

  const signIn = useCallback(
    async (email: string, password: string) => {
      const next = await auth.signInWithPassword(email, password);
      setSession(next);
    },
    [auth],
  );

  const signOut = useCallback(async () => {
    try {
      await auth.signOut();
    } finally {
      setSession(null);
      clearOperationalState();
    }
  }, [auth]);

  const reloadDriverProfile = useCallback(() => setDriverReloadToken((token) => token + 1), []);

  const status: AuthStatus = isRestoring ? 'initializing' : session ? 'signedIn' : 'signedOut';

  const value = useMemo<AuthContextValue>(
    () => ({ status, session, driverProfile, signIn, signOut, reloadDriverProfile }),
    [status, session, driverProfile, signIn, signOut, reloadDriverProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>.');
  return value;
}
