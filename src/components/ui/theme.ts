import type { TextStyle } from 'react-native';

/**
 * Design tokens.
 *
 * These are neutral, accessible defaults and NOT official Eskort brand
 * colours or typography. Swap `lightColors`/`darkColors` (and fonts) for
 * approved brand tokens once they are supplied. Text/background pairs meet
 * WCAG AA contrast (4.5:1) in both schemes.
 */
export type ColorTokens = {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  danger: string;
  onDanger: string;
  success: string;
  warning: string;
  info: string;
};

const lightColors: ColorTokens = {
  background: '#F6F7F9',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF0F3',
  border: '#D0D5DD',
  text: '#101828',
  textMuted: '#475467',
  primary: '#1D4ED8',
  primaryPressed: '#1E40AF',
  onPrimary: '#FFFFFF',
  danger: '#B42318',
  onDanger: '#FFFFFF',
  success: '#067647',
  warning: '#B54708',
  info: '#1D4ED8',
};

const darkColors: ColorTokens = {
  background: '#0C111D',
  surface: '#161B26',
  surfaceMuted: '#1F2532',
  border: '#333A47',
  text: '#F5F5F6',
  textMuted: '#A4ACB9',
  primary: '#84ADFF',
  primaryPressed: '#B2CCFF',
  onPrimary: '#0C111D',
  danger: '#FDA29B',
  onDanger: '#0C111D',
  success: '#75E0A7',
  warning: '#FEC84B',
  info: '#84ADFF',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radii = { sm: 6, md: 10, lg: 16, pill: 999 } as const;

export const typography = {
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

/** Minimum touch target (Android 48dp, iOS 44pt). */
export const MIN_TOUCH_TARGET = 48;

export type Theme = {
  scheme: 'light' | 'dark';
  colors: ColorTokens;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
};

export const themes: Record<Theme['scheme'], Theme> = {
  light: { scheme: 'light', colors: lightColors, spacing, radii, typography },
  dark: { scheme: 'dark', colors: darkColors, spacing, radii, typography },
};
