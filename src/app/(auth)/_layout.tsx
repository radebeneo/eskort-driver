import { Stack } from 'expo-router';
import type { ReactElement } from 'react';

import { MockModeScreenLayout } from '@/components/mock-mode-screen-layout';

// This stack has no header, so the mock banner clears the status bar itself.
function renderScreenLayout({ children }: { children: ReactElement }) {
  return <MockModeScreenLayout headerless>{children}</MockModeScreenLayout>;
}

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} screenLayout={renderScreenLayout} />;
}
