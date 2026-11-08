import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Text, useTheme } from '@/components/ui';
import { formatAddress, formatDateTime } from '@/lib/format';
import type { Delivery } from '@/types/delivery';

import { DELIVERY_STATUS_LABELS } from './delivery-status';
import { DeliveryStatusBadge } from './delivery-status-badge';

export type DeliveryCardProps = {
  delivery: Delivery;
  /** Highlights the delivery the driver is currently working on. */
  isSelected: boolean;
  onPress: () => void;
};

export function DeliveryCard({ delivery, isSelected, onPress }: DeliveryCardProps) {
  const { colors, spacing } = useTheme();
  const address = formatAddress(delivery.address);
  const statusLabel = DELIVERY_STATUS_LABELS[delivery.status];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Order ${delivery.orderNumber}, ${statusLabel}, ${delivery.customerName}, ${address}${isSelected ? ', current delivery' : ''}`}
      accessibilityHint="Opens delivery details"
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}>
      <Card style={isSelected ? { borderColor: colors.primary, borderWidth: 2 } : undefined}>
        <View style={[styles.header, { gap: spacing.sm }]}>
          <Text variant="bodyStrong">Order {delivery.orderNumber}</Text>
          <DeliveryStatusBadge status={delivery.status} />
        </View>
        <Text>{delivery.customerName}</Text>
        <Text tone="muted">{address}</Text>
        {delivery.scheduledFor ? (
          <Text variant="caption" tone="muted">
            Scheduled {formatDateTime(delivery.scheduledFor)}
          </Text>
        ) : null}
        {isSelected ? (
          <Text variant="caption" tone="primary">
            Current delivery
          </Text>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pressed: { opacity: 0.85 },
});
