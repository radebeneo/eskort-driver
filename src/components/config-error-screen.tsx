import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';

/**
 * Shown instead of the app when required client configuration is missing or
 * invalid. Lists variable names and problems only, never values.
 */
export function ConfigErrorScreen({ issues }: { issues: string[] }) {
  useEffect(() => {
    SplashScreen.hide();
  }, []);

  return (
    <Screen scroll edges={['top', 'bottom', 'left', 'right']}>
      <Text variant="title">App configuration error</Text>
      <Text tone="muted">
        The app cannot start until these settings are fixed. Copy .env.example to .env, set the
        values, then restart the dev server with a cleared cache (npx expo start --clear).
      </Text>
      {issues.map((issue) => (
        <Card key={issue}>
          <Text tone="danger">{issue}</Text>
        </Card>
      ))}
    </Screen>
  );
}
