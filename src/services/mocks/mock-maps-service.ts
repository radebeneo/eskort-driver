/**
 * ⚠️ MOCK MAPS. Straight-line estimates and fake places. No Google calls.
 * The numbers are illustrative, not real routes. Development use only.
 */
import { AppError } from '@/lib/errors';
import { haversineDistanceMeters } from '@/lib/geo';
import type { MapsService } from '@/services/maps/maps-service';
import type { GeoPoint } from '@/types/geo';

import { MOCK_PLACES } from './mock-data';
import { simulateLatency } from './mock-utils';

// Rough road-distance factor and urban speed, used for the fake estimates.
const ROAD_FACTOR = 1.3;
const AVERAGE_SPEED_METERS_PER_SECOND = 30_000 / 3600;

function estimate(origin: GeoPoint, destination: GeoPoint) {
  const distanceMeters = Math.round(haversineDistanceMeters(origin, destination) * ROAD_FACTOR);
  return {
    distanceMeters,
    durationSeconds: Math.round(distanceMeters / AVERAGE_SPEED_METERS_PER_SECOND),
  };
}

export function createMockMapsService(): MapsService {
  return {
    async computeRoute({ origin, destination }) {
      await simulateLatency();
      return { ...estimate(origin, destination), encodedPolyline: null };
    },

    async getDistanceMatrix({ origins, destinations }) {
      await simulateLatency();
      return {
        elements: origins.flatMap((origin, originIndex) =>
          destinations.map((destination, destinationIndex) => ({
            originIndex,
            destinationIndex,
            status: 'ok' as const,
            ...estimate(origin, destination),
          })),
        ),
      };
    },

    async autocompletePlaces({ input }) {
      await simulateLatency(200);
      const query = input.trim().toLowerCase();
      return MOCK_PLACES.filter((place) =>
        place.formattedAddress.toLowerCase().includes(query),
      ).map((place) => ({
        placeId: place.placeId,
        primaryText: place.formattedAddress.split(',')[0] ?? place.formattedAddress,
        secondaryText: 'Mock place',
      }));
    },

    async getPlaceDetails({ placeId }) {
      await simulateLatency(200);
      const place = MOCK_PLACES.find((candidate) => candidate.placeId === placeId);
      if (!place) throw new AppError('not_found', 'The requested record was not found.');
      return { ...place, location: { ...place.location } };
    },
  };
}
