import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';

import { useServices } from '@/providers/services-provider';
import type { LocationPermission } from '@/services/location/location-service';

const UNKNOWN_PERMISSION: LocationPermission = { status: 'undetermined', canAskAgain: true };

export type LocationPermissionControls = {
  /** Null while the current permission is being checked. */
  permission: LocationPermission | null;
  requestPermission: () => Promise<void>;
  openSettings: () => void;
};

/**
 * Foreground location permission. Re-checks when the app returns to the
 * foreground, so changes made in system Settings are picked up.
 */
export function useLocationPermission(): LocationPermissionControls {
  const { location } = useServices();
  const [permission, setPermission] = useState<LocationPermission | null>(null);

  useEffect(() => {
    let active = true;
    const check = () => {
      location.getPermission().then(
        (next) => {
          if (active) setPermission(next);
        },
        () => {
          if (active) setPermission(UNKNOWN_PERMISSION);
        },
      );
    };
    check();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [location]);

  const requestPermission = useCallback(async () => {
    try {
      setPermission(await location.requestPermission());
    } catch {
      setPermission(UNKNOWN_PERMISSION);
    }
  }, [location]);

  const openSettings = useCallback(() => {
    void Linking.openSettings();
  }, []);

  return { permission, requestPermission, openSettings };
}
