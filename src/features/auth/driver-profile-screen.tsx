import { Fragment, useState } from 'react';

import { Button, Card, InfoRow, Screen, Text } from '@/components/ui';
import { TrackingPreferencesSection } from '@/features/location/tracking-preferences-section';
import { useAuth } from '@/providers/auth-provider';
import { useServices } from '@/providers/services-provider';

function DriverDetails() {
  const { driverProfile, reloadDriverProfile } = useAuth();

  if (driverProfile.status === 'loading') {
    return <Text tone="muted">Loading your profile…</Text>;
  }
  if (driverProfile.status === 'error') {
    return (
      <Fragment>
        <Text tone="danger" accessibilityRole="alert">
          {driverProfile.error.message}
        </Text>
        <Button label="Try again" variant="secondary" onPress={reloadDriverProfile} />
      </Fragment>
    );
  }

  const { driver } = driverProfile;
  return (
    <Fragment>
      <InfoRow label="Name" value={driver.fullName} />
      <InfoRow label="Phone" value={driver.phone ?? 'Not set'} />
      <InfoRow label="Vehicle" value={driver.vehicleRegistration ?? 'Not set'} />
      <InfoRow label="Status" value={driver.isActive ? 'Active' : 'Inactive'} />
    </Fragment>
  );
}

export function DriverProfileScreen() {
  const { session, signOut } = useAuth();
  const { mode } = useServices();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
      // The protected-route guard returns to sign-in.
    } catch {
      setIsSigningOut(false);
    }
  }

  return (
    <Screen scroll>
      <Card>
        <Text variant="heading">Driver</Text>
        <DriverDetails />
      </Card>

      <Card>
        <Text variant="heading">Account</Text>
        <InfoRow label="Email" value={session?.email ?? 'Unknown'} />
        <InfoRow
          label="Data source"
          value={mode === 'mock' ? 'Mock data (development only)' : 'Live (Supabase)'}
        />
      </Card>

      <TrackingPreferencesSection />

      <Button
        label="Sign out"
        variant="danger"
        loading={isSigningOut}
        onPress={() => void handleSignOut()}
      />
    </Screen>
  );
}
