import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/components/ui/use-theme';
import { useServices } from '@/providers/services-provider';

/**
 * Visible marker that the app is running on mock services (EXPO_PUBLIC_USE_MOCKS=true).
 * Rendered by `MockModeScreenLayout` in the route-group layouts; do not add it to screens.
 */
export function MockModeBanner() {
  const { mode } = useServices();
  const { colors, radii, spacing } = useTheme();
  if (mode !== 'mock') return null;
  return (
    <View
      accessible
      accessibilityLabel="Mock mode. Data is fictional and not connected to Supabase."
      style={{
        backgroundColor: colors.surfaceMuted,
        borderColor: colors.warning,
        borderWidth: 1,
        borderRadius: radii.md,
        padding: spacing.md,
      }}>
      <Text variant="caption" tone="warning">
        MOCK MODE · Fictional data, not connected to Supabase.
      </Text>
    </View>
  );
}
