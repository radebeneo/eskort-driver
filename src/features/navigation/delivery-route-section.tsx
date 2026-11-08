import { Fragment } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { PermissionDeniedState } from '@/components/states';
import { Button, Card, InfoRow, Text, useTheme } from '@/components/ui';
import { useLocationPermission } from '@/features/location/use-location-permission';
import { formatDistance, formatDuration } from '@/lib/format';
import { useServices } from '@/providers/services-provider';
import type { GeoPoint } from '@/types/geo';

import { openDirections } from './directions';
import { useRouteEstimate } from './use-route-estimate';

const LOCATION_REASON = 'Your location is used to estimate the drive to this delivery.';

function RouteEstimate({ destination }: { destination: GeoPoint }) {
  const { state, retry } = useRouteEstimate(destination);
  const { mode } = useServices();
  const { colors, spacing } = useTheme();

  if (state.status === 'loading') {
    return (
      <View
        accessible
        accessibilityLabel="Calculating route"
        style={[styles.row, { gap: spacing.sm }]}>
        <ActivityIndicator color={colors.primary} />
        <Text tone="muted">Calculating route…</Text>
      </View>
    );
  }
  if (state.status === 'error') {
    return (
      <Fragment>
        <Text tone="danger" accessibilityRole="alert">
          {state.error.message}
        </Text>
        <Button label="Try again" variant="secondary" onPress={retry} />
      </Fragment>
    );
  }
  return (
    <Fragment>
      <InfoRow label="Distance" value={formatDistance(state.data.distanceMeters)} />
      <InfoRow label="Drive time" value={formatDuration(state.data.durationSeconds)} />
      {mode === 'mock' ? (
        <Text variant="caption" tone="warning">
          Mock estimate based on straight-line distance, not a real route.
        </Text>
      ) : null}
    </Fragment>
  );
}

export type DeliveryRouteSectionProps = {
  /** Null when the delivery address has not been geocoded. */
  destination: GeoPoint | null;
  /** Formatted address, used when there are no coordinates. */
  address: string;
};

export function DeliveryRouteSection({ destination, address }: DeliveryRouteSectionProps) {
  const { permission, requestPermission, openSettings } = useLocationPermission();

  let estimate;
  if (!destination) {
    estimate = (
      <Text tone="muted">This address has no coordinates, so no estimate is available.</Text>
    );
  } else if (!permission) {
    estimate = <Text tone="muted">Checking location access…</Text>;
  } else if (permission.status === 'granted') {
    estimate = <RouteEstimate destination={destination} />;
  } else {
    estimate = (
      <PermissionDeniedState
        permissionName="Location"
        title={
          permission.status === 'undetermined' ? 'Location access needed' : 'Location access is off'
        }
        message={LOCATION_REASON}
        canAskAgain={permission.canAskAgain}
        onRequestPermission={() => void requestPermission()}
        onOpenSettings={openSettings}
      />
    );
  }

  return (
    <Card>
      <Text variant="heading">Route</Text>
      {estimate}
      <Button
        label="Open in Google Maps"
        variant="secondary"
        accessibilityHint="Opens turn-by-turn directions in Google Maps"
        onPress={() => void openDirections(destination ?? address)}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
