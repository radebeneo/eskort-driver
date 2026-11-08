import { useState, type ReactNode } from 'react';

import type { AppConfig } from '@/config/env';
import { AuthProvider } from '@/providers/auth-provider';
import { ServicesProvider } from '@/providers/services-provider';
import { createServices } from '@/services';

/** Creates the service graph once and provides services and auth to the app. */
export function AppProviders({ config, children }: { config: AppConfig; children: ReactNode }) {
  const [services] = useState(() => createServices(config));
  return (
    <ServicesProvider services={services}>
      <AuthProvider>{children}</AuthProvider>
    </ServicesProvider>
  );
}
