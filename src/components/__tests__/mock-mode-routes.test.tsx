import { renderRouter, screen } from 'expo-router/testing-library';
import { Stack } from 'expo-router';
import type { ReactNode } from 'react';

import AppLayout from '@/app/(app)/_layout';
import DeliveryDetailsRoute from '@/app/(app)/deliveries/[id]';
import DeliveriesRoute from '@/app/(app)/index';
import ProfileRoute from '@/app/(app)/profile';
import AuthLayout from '@/app/(auth)/_layout';
import SignInRoute from '@/app/(auth)/sign-in';
import { AppError } from '@/lib/errors';
import { AuthProvider } from '@/providers/auth-provider';
import { ServicesProvider } from '@/providers/services-provider';
import type { ServiceMode, Services } from '@/services';
import type { AuthService } from '@/services/auth/auth-service';
import type { LocationService } from '@/services/location/location-service';
import { createMockServices } from '@/services/mocks';
import { MOCK_DELIVERY_RECORDS, MOCK_DRIVER, MOCK_USER_ID } from '@/services/mocks/mock-data';
import type { AuthSession } from '@/types/auth';
import type { Delivery } from '@/types/delivery';
import type { DriverProfile } from '@/types/driver';

/**
 * Renders the real route-group layouts and screens to check that the mock
 * banner appears exactly once in mock mode, in every state, and never in live mode.
 */

const MOCK_BANNER_LABEL = 'Mock mode. Data is fictional and not connected to Supabase.';

const DELIVERIES: Delivery[] = MOCK_DELIVERY_RECORDS.map((record) => record.delivery);
const FIRST_DELIVERY = DELIVERIES.find((delivery) => delivery.id === 'mock-delivery-0001') ?? null;

const SESSION: AuthSession = { userId: MOCK_USER_ID, email: 'driver@example.com', expiresAt: null };

const deniedLocation: LocationService = {
  getPermission: () => Promise.resolve({ status: 'denied', canAskAgain: false }),
  requestPermission: () => Promise.resolve({ status: 'denied', canAskAgain: false }),
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
};

function pending<T>(): Promise<T> {
  return new Promise<T>(() => undefined);
}

function failure(): Promise<never> {
  return Promise.reject(new AppError('network', 'No connection.'));
}

type Scenario = {
  signedIn?: boolean;
  driver?: () => Promise<DriverProfile | null>;
  list?: () => Promise<Delivery[]>;
  detail?: () => Promise<Delivery | null>;
};

function createTestServices(mode: ServiceMode, scenario: Scenario): Services {
  const base = createMockServices(deniedLocation);
  const auth: AuthService = {
    ...base.auth,
    restoreSession: () => Promise.resolve(scenario.signedIn === false ? null : SESSION),
    onSessionChange: () => () => undefined,
  };
  return {
    ...base,
    mode,
    auth,
    drivers: { getByUserId: scenario.driver ?? (() => Promise.resolve({ ...MOCK_DRIVER })) },
    deliveries: {
      ...base.deliveries,
      listAssigned: scenario.list ?? (() => Promise.resolve(DELIVERIES)),
      getById: scenario.detail ?? (() => Promise.resolve(FIRST_DELIVERY)),
    },
  };
}

// Mirrors the root stack without the auth guards, so each route can be opened directly.
function TestRootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}

async function renderAt(url: string, services: Services) {
  function Providers({ children }: { children: ReactNode }) {
    return (
      <ServicesProvider services={services}>
        <AuthProvider>{children}</AuthProvider>
      </ServicesProvider>
    );
  }

  await renderRouter(
    {
      _layout: TestRootLayout,
      '(auth)/_layout': AuthLayout,
      '(auth)/sign-in': SignInRoute,
      '(app)/_layout': AppLayout,
      '(app)/index': DeliveriesRoute,
      '(app)/deliveries/[id]': DeliveryDetailsRoute,
      '(app)/profile': ProfileRoute,
    },
    { initialUrl: url, wrapper: Providers },
  );
}

type RouteCase = {
  name: string;
  url: string;
  scenario: Scenario;
  waitForState: () => Promise<unknown>;
};

const DETAILS_URL = '/deliveries/mock-delivery-0001';

const CASES: RouteCase[] = [
  {
    name: 'sign-in',
    url: '/sign-in',
    scenario: { signedIn: false },
    waitForState: () => screen.findByText('Driver sign-in'),
  },
  {
    name: 'assigned deliveries while the profile loads',
    url: '/',
    scenario: { driver: pending },
    waitForState: () => screen.findByLabelText('Loading your profile…'),
  },
  {
    name: 'assigned deliveries when the profile fails',
    url: '/',
    scenario: { driver: failure },
    waitForState: () => screen.findByText('Profile unavailable'),
  },
  {
    name: 'assigned deliveries for an inactive account',
    url: '/',
    scenario: { driver: () => Promise.resolve({ ...MOCK_DRIVER, isActive: false }) },
    waitForState: () => screen.findByText('Account inactive'),
  },
  {
    name: 'assigned deliveries while the list loads',
    url: '/',
    scenario: { list: pending },
    waitForState: () => screen.findByLabelText('Loading deliveries…'),
  },
  {
    name: 'assigned deliveries when the list fails',
    url: '/',
    scenario: { list: failure },
    waitForState: () => screen.findByText("Couldn't load deliveries"),
  },
  {
    name: 'assigned deliveries when none are assigned',
    url: '/',
    scenario: { list: () => Promise.resolve([]) },
    waitForState: () => screen.findByText('No deliveries assigned'),
  },
  {
    name: 'assigned deliveries list',
    url: '/',
    scenario: {},
    waitForState: () => screen.findAllByText(/MOCK-1001/),
  },
  {
    name: 'delivery details while loading',
    url: DETAILS_URL,
    scenario: { detail: pending },
    waitForState: () => screen.findByLabelText('Loading delivery…'),
  },
  {
    name: 'delivery details when loading fails',
    url: DETAILS_URL,
    scenario: { detail: failure },
    waitForState: () => screen.findByText("Couldn't load this delivery"),
  },
  {
    name: 'delivery details when not found',
    url: DETAILS_URL,
    scenario: { detail: () => Promise.resolve(null) },
    waitForState: () => screen.findByText('Delivery not found'),
  },
  {
    name: 'delivery details',
    url: DETAILS_URL,
    scenario: {},
    waitForState: () => screen.findByText('Customer'),
  },
  {
    name: 'profile',
    url: '/profile',
    scenario: {},
    waitForState: () => screen.findByText('Mock Driver'),
  },
];

afterEach(() => {
  jest.useRealTimers();
});

describe.each(CASES)('$name', ({ url, scenario, waitForState }) => {
  it('shows exactly one mock banner in mock mode', async () => {
    await renderAt(url, createTestServices('mock', scenario));
    await waitForState();

    expect(screen.getAllByLabelText(MOCK_BANNER_LABEL)).toHaveLength(1);
  });

  it('shows no mock banner in live mode', async () => {
    await renderAt(url, createTestServices('live', scenario));
    await waitForState();

    expect(screen.queryByLabelText(MOCK_BANNER_LABEL)).toBeNull();
  });
});
