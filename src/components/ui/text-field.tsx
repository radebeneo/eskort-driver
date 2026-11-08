import type { ComponentRef, Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Text } from './text';
import { MIN_TOUCH_TARGET } from './theme';
import { useTheme } from './use-theme';

export type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  /** Validation message. Announced politely to screen readers. */
  error?: string | null;
  hint?: string;
  ref?: Ref<ComponentRef<typeof TextInput>>;
};

export function TextField({ label, error, hint, editable = true, ref, ...rest }: TextFieldProps) {
  const { colors, radii, spacing, typography } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="label">{label}</Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        accessibilityHint={hint}
        placeholderTextColor={colors.textMuted}
        editable={editable}
        style={[
          styles.input,
          {
            fontSize: typography.body.fontSize,
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.border,
            borderRadius: radii.md,
            paddingHorizontal: spacing.md,
          },
          !editable && styles.readOnly,
        ]}
        {...rest}
      />
      {error ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: MIN_TOUCH_TARGET, borderWidth: 1 },
  readOnly: { opacity: 0.6 },
});
