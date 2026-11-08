import { useColorScheme } from '@/hooks/use-color-scheme';

import { themes, type Theme } from './theme';

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? themes.dark : themes.light;
}
