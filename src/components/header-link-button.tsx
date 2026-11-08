import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/ui/text';

export type HeaderLinkButtonProps = {
  href: Href;
  label: string;
};

/** Text button for navigation headers. */
export function HeaderLinkButton({ href, label }: HeaderLinkButtonProps) {
  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="button" hitSlop={12} style={styles.button}>
        <Text variant="label" tone="primary">
          {label}
        </Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
});
