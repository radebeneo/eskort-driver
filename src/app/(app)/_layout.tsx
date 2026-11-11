import { Stack } from 'expo-router';
import type { ReactElement } from 'react';

import { HeaderLinkButton } from '@/components/header-link-button';
import { MockModeScreenLayout } from '@/components/mock-mode-screen-layout';

export const unstable_settings = {
  // Deep links into a delivery keep the deliveries list underneath for "back".
  anchor: 'index',
};

// Wraps every screen below the native header, so the mock banner covers all states.
function renderScreenLayout({ children }: { children: ReactElement }) {
  return <MockModeScreenLayout>{children}</MockModeScreenLayout>;
}

export default function AppLayout() {
  return (
    <Stack screenLayout={renderScreenLayout}>
      <Stack.Screen
        name="index"
        options={{
          title: 'My deliveries',
          headerRight: () => <HeaderLinkButton href="/profile" label="Profile" />,
        }}
      />
      <Stack.Screen name="deliveries/[id]" options={{ title: 'Delivery' }} />
      <Stack.Screen name="profile" options={{ title: 'Profile' }} />
    </Stack>
  );
}
