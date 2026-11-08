import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Text } from './text';
import { MIN_TOUCH_TARGET, type ColorTokens } from './theme';
import { useTheme } from './use-theme';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: ButtonVariant;
  /** Shows a spinner and disables the button. */
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

function variantColors(variant: ButtonVariant, colors: ColorTokens) {
  switch (variant) {
    case 'primary':
      return { background: colors.primary, foreground: colors.onPrimary, border: colors.primary };
    case 'danger':
      return { background: colors.danger, foreground: colors.onDanger, border: colors.danger };
    case 'secondary':
      return { background: colors.surface, foreground: colors.text, border: colors.border };
    case 'ghost':
      return { background: 'transparent', foreground: colors.primary, border: 'transparent' };
  }
}

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  style,
  accessibilityLabel,
  ...rest
}: ButtonProps) {
  const { colors, radii, spacing } = useTheme();
  const palette = variantColors(variant, colors);
  const isDisabled = Boolean(disabled) || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      hitSlop={4}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
          borderRadius: radii.md,
          paddingHorizontal: spacing.lg,
          gap: spacing.sm,
        },
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}>
      {loading ? <ActivityIndicator color={palette.foreground} /> : null}
      <Text variant="label" style={{ color: palette.foreground }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
});
