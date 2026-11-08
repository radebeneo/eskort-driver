/**
 * ⚠️ MOCK SERVICES. Selected only by `createServices` when
 * EXPO_PUBLIC_USE_MOCKS=true. Config validation rejects mocks in production.
 */
import type { LocationService } from '@/services/location/location-service';
import type { Services } from '@/services/types';

import { createMockAuthService } from './mock-auth-service';
import { createMockDeliveryRepository } from './mock-delivery-repository';
import { createMockDriverRepository } from './mock-driver-repository';
import { createMockMapsService } from './mock-maps-service';

export function createMockServices(location: LocationService): Services {
  return {
    mode: 'mock',
    auth: createMockAuthService(),
    deliveries: createMockDeliveryRepository(),
    drivers: createMockDriverRepository(),
    maps: createMockMapsService(),
    location,
  };
}
