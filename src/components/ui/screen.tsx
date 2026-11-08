import type { ReactElement, ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme } from './use-theme';

export type ScreenProps = {
  children: ReactNode;
  /** Wrap content in a ScrollView. Use FlatList directly for long lists instead. */
  scroll?: boolean;
  refreshControl?: ReactElement<RefreshControlProps>;
  /** The navigation header already handles the top inset, so it is excluded by default. */
  edges?: Edge[];
  /** Set to false for full-bleed content such as lists that manage their own padding. */
  padded?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

const DEFAULT_EDGES: Edge[] = ['bottom', 'left', 'right'];

export function Screen({
  children,
  scroll = false,
  refreshControl,
  edges = DEFAULT_EDGES,
  padded = true,
  contentStyle,
}: ScreenProps) {
  const { colors, spacing } = useTheme();
  const padding = padded ? { padding: spacing.lg, gap: spacing.lg } : null;

  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: colors.background }]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[padding, contentStyle]}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, padding, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
