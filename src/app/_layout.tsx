import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';

import { ConfigErrorScreen } from '@/components/config-error-screen';
import { useTheme } from '@/components/ui/use-theme';
import { getConfigResult } from '@/config/env';
import { SplashScreenController } from '@/features/auth/splash-screen-controller';
import { AppProviders } from '@/providers/app-providers';
import { useAuth } from '@/providers/auth-provider';

void SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { status } = useAuth();
  // The splash screen stays visible until the stored session is restored.
  if (status === 'initializing') return null;

  const isSignedIn = status === 'signedIn';
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const theme = useTheme();
  const navigationTheme = useMemo(() => {
    const base = theme.scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.text,
        border: theme.colors.border,
      },
    };
  }, [theme]);
  const configResult = getConfigResult();

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style="auto" />
      {configResult.ok ? (
        <AppProviders config={configResult.config}>
          <SplashScreenController />
          <RootNavigator />
        </AppProviders>
      ) : (
        <ConfigErrorScreen issues={configResult.issues} />
      )}
    </ThemeProvider>
  );
}
