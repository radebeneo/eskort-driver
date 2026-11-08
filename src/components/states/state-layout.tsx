import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/components/ui/use-theme';

type StateLayoutProps = {
  title: string;
  message?: string | null;
  /** Actions (buttons) shown below the message. */
  children?: ReactNode;
  /** Announce the state immediately (used for errors). */
  isAlert?: boolean;
  testID?: string;
};

/** Shared centred layout for full-screen loading, empty, error and permission states. */
export function StateLayout({
  title,
  message,
  children,
  isAlert = false,
  testID,
}: StateLayoutProps) {
  const { spacing } = useTheme();
  return (
    <View
      testID={testID}
      accessibilityRole={isAlert ? 'alert' : undefined}
      style={[styles.container, { padding: spacing.xl, gap: spacing.md }]}>
      <Text variant="heading" style={styles.centered}>
        {title}
      </Text>
      {message ? (
        <Text tone="muted" style={styles.centered}>
          {message}
        </Text>
      ) : null}
      {children ? (
        <View style={[styles.actions, { gap: spacing.sm, marginTop: spacing.sm }]}>{children}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centered: { textAlign: 'center' },
  actions: { alignSelf: 'stretch', maxWidth: 360, width: '100%', marginHorizontal: 'auto' },
});
