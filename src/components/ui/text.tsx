import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import type { ColorTokens, TypographyVariant } from './theme';
import { useTheme } from './use-theme';

export type TextTone = 'default' | 'muted' | 'primary' | 'danger' | 'success' | 'warning';

const TONE_COLOR: Record<TextTone, keyof ColorTokens> = {
  default: 'text',
  muted: 'textMuted',
  primary: 'primary',
  danger: 'danger',
  success: 'success',
  warning: 'warning',
};

export type TextProps = RNTextProps & {
  variant?: TypographyVariant;
  tone?: TextTone;
};

/** Themed text. Titles and headings are exposed to screen readers as headers. */
export function Text({ variant = 'body', tone = 'default', style, ...rest }: TextProps) {
  const { colors, typography } = useTheme();
  const isHeader = variant === 'title' || variant === 'heading';
  return (
    <RNText
      accessibilityRole={isHeader ? 'header' : undefined}
      style={[typography[variant], { color: colors[TONE_COLOR[tone]] }, style]}
      {...rest}
    />
  );
}
