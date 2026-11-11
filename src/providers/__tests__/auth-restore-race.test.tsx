import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Fragment } from 'react';
import { Pressable, Text } from 'react-native';

import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { ServicesProvider } from '@/providers/services-provider';
import type { AuthService } from '@/services/auth/auth-service';
import type { LocationService } from '@/services/location/location-service';
import { createMockServices } from '@/services/mocks';
import { MOCK_USER_ID } from '@/services/mocks/mock-data';
import type { AuthSession } from '@/types/auth';

const unusedLocation: LocationService = {
  getPermission: jest.fn(),
  requestPermission: jest.fn(),
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
};

const RESTORED_SESSION: AuthSession = {
  userId: MOCK_USER_ID,
  email: 'driver@example.com',
  expiresAt: null,
};

function createHarness() {
  let resolveRestore!: (session: AuthSession | null) => void;
  const restoration = new Promise<AuthSession | null>((resolve) => {
    resolveRestore = resolve;
  });

  let listener: ((session: AuthSession | null) => void) | null = null;
  const services = createMockServices(unusedLocation);

  const auth: AuthService = {
    ...services.auth,
    restoreSession: jest.fn(() => restoration),

    // Deliberately emits no event: explicit sign-out must also invalidate
    // an outstanding restoration request.
    signOut: jest.fn(async () => {}),

    onSessionChange(nextListener) {
      listener = nextListener;
      return () => {
        listener = null;
      };
    },
  };

  return {
    services: { ...services, auth },
    resolveRestore,
    emitSession(session: AuthSession | null) {
      if (!listener) throw new Error('Authentication listener is not registered.');
      listener(session);
    },
  };
}

function Probe() {
  const { status, session, signOut } = useAuth();

  return (
    <Fragment>
      <Text>{`status:${status}`}</Text>
      <Text>{`session:${session?.email ?? 'none'}`}</Text>

      <Pressable accessibilityRole="button" onPress={() => void signOut()}>
        <Text>Sign out</Text>
      </Pressable>
    </Fragment>
  );
}

async function renderHarness(harness: ReturnType<typeof createHarness>) {
  await render(
    <ServicesProvider services={harness.services}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </ServicesProvider>,
  );
}

describe('AuthProvider restoration races', () => {
  it('does not restore an old session after a sign-out event', async () => {
    const harness = createHarness();
    await renderHarness(harness);

    expect(screen.getByText('status:initializing')).toBeTruthy();

    await act(async () => {
      harness.emitSession(null);
      harness.resolveRestore(RESTORED_SESSION);
    });

    expect(await screen.findByText('status:signedOut')).toBeTruthy();
    expect(screen.getByText('session:none')).toBeTruthy();
  });

  it('does not restore an old session after explicit sign-out without an event', async () => {
    const harness = createHarness();
    await renderHarness(harness);

    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));

    await act(async () => {
      harness.resolveRestore(RESTORED_SESSION);
    });

    expect(await screen.findByText('status:signedOut')).toBeTruthy();
    expect(screen.getByText('session:none')).toBeTruthy();
  });

  it('still restores a session when no newer authentication action occurred', async () => {
    const harness = createHarness();
    await renderHarness(harness);

    await act(async () => {
      harness.resolveRestore(RESTORED_SESSION);
    });

    expect(await screen.findByText('status:signedIn')).toBeTruthy();
    expect(screen.getByText('session:driver@example.com')).toBeTruthy();
  });
});
