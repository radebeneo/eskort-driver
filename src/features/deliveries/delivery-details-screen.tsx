import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { Button, Card, InfoRow, Screen, Text, useTheme } from '@/components/ui';
import { DeliveryRouteSection } from '@/features/navigation/delivery-route-section';
import { formatAddress, formatDateTime } from '@/lib/format';
import { useDeliverySelectionStore } from '@/stores/delivery-selection-store';
import type { Delivery } from '@/types/delivery';

import { DeliveryStatusBadge } from './delivery-status-badge';
import { callPhoneNumber } from './phone';
import { useDelivery } from './use-deliveries';

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

function DeliveryDetails({ delivery }: { delivery: Delivery }) {
  const { spacing } = useTheme();
  const address = formatAddress(delivery.address);
  const { customerPhone } = delivery;

  return (
    <Screen scroll>
      <Card>
        <View style={[styles.header, { gap: spacing.sm }]}>
          <Text variant="heading">Order {delivery.orderNumber}</Text>
          <DeliveryStatusBadge status={delivery.status} />
        </View>
        {delivery.scheduledFor ? (
          <InfoRow label="Scheduled" value={formatDateTime(delivery.scheduledFor)} />
        ) : null}
        <InfoRow label="Last updated" value={formatDateTime(delivery.updatedAt)} />
      </Card>

      <Card>
        <Text variant="heading">Customer</Text>
        <InfoRow label="Name" value={delivery.customerName} />
        <InfoRow label="Address" value={address} />
        {delivery.notes ? <InfoRow label="Notes" value={delivery.notes} /> : null}
        {customerPhone ? (
          <Button
            label="Call customer"
            variant="secondary"
            accessibilityHint={`Calls ${delivery.customerName}`}
            onPress={() => void callPhoneNumber(customerPhone)}
          />
        ) : null}
      </Card>

      <DeliveryRouteSection destination={delivery.address.location} address={address} />

      <Card>
        <Text variant="heading">Items</Text>
        {delivery.items.length === 0 ? (
          <Text tone="muted">No items are listed for this order.</Text>
        ) : (
          delivery.items.map((item) => (
            <Text key={item.id}>
              {item.quantity} × {item.name}
            </Text>
          ))
        )}
      </Card>
    </Screen>
  );
}

export function DeliveryDetailsScreen({ deliveryId }: { deliveryId: string }) {
  const { state, retry } = useDelivery(deliveryId);
  const selectDelivery = useDeliverySelectionStore((store) => store.selectDelivery);

  // Deep links can open a delivery directly, so record the selection here too.
  useEffect(() => {
    selectDelivery(deliveryId);
  }, [deliveryId, selectDelivery]);

  if (state.status === 'loading') {
    return (
      <Screen>
        <LoadingState label="Loading delivery…" />
      </Screen>
    );
  }
  if (state.status === 'error') {
    return (
      <Screen>
        <ErrorState title="Couldn't load this delivery" error={state.error} onRetry={retry} />
      </Screen>
    );
  }
  if (!state.data) {
    return (
      <Screen>
        <EmptyState
          title="Delivery not found"
          message="It may have been reassigned or cancelled."
          action={{ label: 'Back to deliveries', onPress: goBack }}
        />
      </Screen>
    );
  }
  return <DeliveryDetails delivery={state.data} />;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
