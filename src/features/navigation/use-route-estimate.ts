import { useCallback } from 'react';

import { useAsyncResource } from '@/lib/use-async-resource';
import { useServices } from '@/providers/services-provider';
import { useTrackingPreferencesStore } from '@/stores/tracking-preferences-store';
import type { GeoPoint } from '@/types/geo';

/**
 * Driving distance and time from the device's current position to the
 * destination, using the maps service (Google via the Edge Function proxy).
 * Only call this once location permission has been granted.
 */
export function useRouteEstimate(destination: GeoPoint) {
  const { location, maps } = useServices();
  const highAccuracy = useTrackingPreferencesStore((state) => state.highAccuracy);
  const { latitude, longitude } = destination;

  const load = useCallback(async () => {
    const position = await location.getCurrentPosition({ highAccuracy });
    return maps.computeRoute({
      origin: { latitude: position.latitude, longitude: position.longitude },
      destination: { latitude, longitude },
    });
  }, [location, maps, highAccuracy, latitude, longitude]);

  return useAsyncResource(load);
}
