import type { AppConfig } from '@/config/env';
import { createSupabaseClient } from '@/lib/supabase';

import { createSupabaseAuthService } from './auth/supabase-auth-service';
import { createSupabaseDeliveryRepository } from './deliveries/supabase-delivery-repository';
import { createSupabaseDriverRepository } from './drivers/supabase-driver-repository';
import { createExpoLocationService } from './location/expo-location-service';
import { createEdgeFunctionMapsService } from './maps/edge-function-maps-service';
import { createMockServices } from './mocks';
import type { Services } from './types';

export type { ServiceMode, Services } from './types';

/**
 * Wires real or mock integrations from validated config. This is the only
 * place where mock implementations are selected.
 */
export function createServices(config: AppConfig): Services {
  // Device location is real in both modes.
  const location = createExpoLocationService();

  if (config.useMocks || !config.supabase) {
    return createMockServices(location);
  }

  const client = createSupabaseClient(config.supabase);
  return {
    mode: 'live',
    auth: createSupabaseAuthService(client),
    deliveries: createSupabaseDeliveryRepository(client),
    drivers: createSupabaseDriverRepository(client),
    maps: createEdgeFunctionMapsService(client, config.googleMapsFunctionName),
    location,
  };
}
