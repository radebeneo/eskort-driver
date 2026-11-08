import { fireEvent, render, screen } from '@testing-library/react-native';
import { Fragment } from 'react';
import { Pressable, Text } from 'react-native';

import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { ServicesProvider } from '@/providers/services-provider';
import type { LocationService } from '@/services/location/location-service';
import { createMockServices } from '@/services/mocks';
import { useDeliverySelectionStore } from '@/stores/delivery-selection-store';

const unusedLocation: LocationService = {
  getPermission: jest.fn(),
  requestPermission: jest.fn(),
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
};

function Probe() {
  const { status, driverProfile, signIn, signOut } = useAuth();
  const driver =
    driverProfile.status === 'ready' ? driverProfile.driver.fullName : driverProfile.status;
  return (
    <Fragment>
      <Text>{`status:${status}`}</Text>
      <Text>{`driver:${driver}`}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => void signIn('driver@example.com', 'secret')}>
        <Text>Sign in</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => void signOut()}>
        <Text>Sign out</Text>
      </Pressable>
    </Fragment>
  );
}

describe('AuthProvider (with mock services)', () => {
  it('restores, signs in, loads the driver profile and clears operational state on sign-out', async () => {
    await render(
      <ServicesProvider services={createMockServices(unusedLocation)}>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </ServicesProvider>,
    );

    expect(await screen.findByText('status:signedOut')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('status:signedIn')).toBeTruthy();
    expect(await screen.findByText('driver:Mock Driver')).toBeTruthy();

    useDeliverySelectionStore.getState().selectDelivery('mock-delivery-0001');
    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByText('status:signedOut')).toBeTruthy();
    expect(useDeliverySelectionStore.getState().selectedDeliveryId).toBeNull();
  });
});
