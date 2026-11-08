import { View } from 'react-native';

import { Text } from './text';

export type InfoRowProps = {
  label: string;
  value: string;
};

/** A label/value pair, read by screen readers as one item. */
export function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={{ gap: 2 }}>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <Text>{value}</Text>
    </View>
  );
}
