import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { useAuth } from '@/providers/auth-provider';

/** Keeps the native splash screen up until the persisted session has been restored. */
export function SplashScreenController() {
  const { status } = useAuth();
  useEffect(() => {
    if (status !== 'initializing') SplashScreen.hide();
  }, [status]);
  return null;
}
