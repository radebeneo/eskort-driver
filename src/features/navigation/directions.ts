import { Alert, Linking } from 'react-native';

import type { GeoPoint } from '@/types/geo';

/**
 * Google Maps "directions" URL. Needs no API key: it opens the Google Maps app
 * when installed, otherwise the browser.
 */
export function buildDirectionsUrl(destination: GeoPoint | string): string {
  const value =
    typeof destination === 'string'
      ? destination.trim()
      : `${destination.latitude},${destination.longitude}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(value)}&travelmode=driving`;
}

export async function openDirections(destination: GeoPoint | string): Promise<void> {
  try {
    await Linking.openURL(buildDirectionsUrl(destination));
  } catch {
    Alert.alert('Could not open maps', 'Install Google Maps or try again.');
  }
}
