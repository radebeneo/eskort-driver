import { StyleSheet, View } from 'react-native';

import { Text, useTheme } from '@/components/ui';
import type { DeliveryStatus } from '@/types/delivery';

import { DELIVERY_STATUS_LABELS, DELIVERY_STATUS_TONES } from './delivery-status';

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  const { colors, radii, spacing } = useTheme();
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.surfaceMuted,
          borderRadius: radii.pill,
          paddingHorizontal: spacing.sm,
        },
      ]}>
      <Text variant="caption" tone={DELIVERY_STATUS_TONES[status]} style={styles.label}>
        {DELIVERY_STATUS_LABELS[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', paddingVertical: 2 },
  label: { fontWeight: '600' },
});
