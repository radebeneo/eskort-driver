import * as Location from 'expo-location';

import { AppError } from '@/lib/errors';
import type { DevicePosition } from '@/types/geo';

import type { LocationPermission, LocationService } from './location-service';

function toPermission(response: Location.LocationPermissionResponse): LocationPermission {
  let status: LocationPermission['status'] = 'undetermined';
  if (response.status === Location.PermissionStatus.GRANTED) status = 'granted';
  else if (response.status === Location.PermissionStatus.DENIED) status = 'denied';
  return { status, canAskAgain: response.canAskAgain };
}

function toPosition(location: Location.LocationObject): DevicePosition {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracyMeters: location.coords.accuracy ?? null,
    timestamp: location.timestamp,
  };
}

const accuracyFor = (highAccuracy: boolean) =>
  highAccuracy ? Location.Accuracy.High : Location.Accuracy.Balanced;

const UNAVAILABLE_MESSAGE =
  'We could not get your location. Make sure location services are switched on.';

/** Foreground ("when in use") location through expo-location. */
export function createExpoLocationService(): LocationService {
  return {
    async getPermission() {
      return toPermission(await Location.getForegroundPermissionsAsync());
    },

    async requestPermission() {
      return toPermission(await Location.requestForegroundPermissionsAsync());
    },

    async getCurrentPosition({ highAccuracy }) {
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: accuracyFor(highAccuracy),
        });
        return toPosition(location);
      } catch (error) {
        throw new AppError('location_unavailable', UNAVAILABLE_MESSAGE, error);
      }
    },

    async watchPosition({ highAccuracy, distanceIntervalMeters }, onPosition) {
      try {
        const subscription = await Location.watchPositionAsync(
          { accuracy: accuracyFor(highAccuracy), distanceInterval: distanceIntervalMeters },
          (location) => onPosition(toPosition(location)),
        );
        return () => subscription.remove();
      } catch (error) {
        throw new AppError('location_unavailable', UNAVAILABLE_MESSAGE, error);
      }
    },
  };
}
