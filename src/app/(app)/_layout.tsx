import { Stack } from 'expo-router';

import { HeaderLinkButton } from '@/components/header-link-button';

export const unstable_settings = {
  // Deep links into a delivery keep the deliveries list underneath for "back".
  anchor: 'index',
};

export default function AppLayout() {
  return (
    <Stack>
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
