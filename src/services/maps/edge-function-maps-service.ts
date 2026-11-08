import type { SupabaseClient } from '@supabase/supabase-js';

import { AppError } from '@/lib/errors';

import {
  parseDistanceMatrix,
  parsePlaceDetails,
  parsePlaceSuggestions,
  parseRouteSummary,
} from './maps-parsers';
import type { MapsService } from './maps-service';

type MapsAction = 'computeRoute' | 'distanceMatrix' | 'placesAutocomplete' | 'placeDetails';

/**
 * Calls the Google Maps proxy Edge Function with `{ action, ...payload }`.
 * The function attaches the server-side Google key and returns the
 * normalised shapes validated in `maps-parsers.ts`.
 */
export function createEdgeFunctionMapsService(
  client: SupabaseClient,
  functionName: string,
): MapsService {
  async function invoke<T>(
    action: MapsAction,
    payload: Record<string, unknown>,
    parse: (value: unknown) => T,
  ): Promise<T> {
    const { data, error } = await client.functions.invoke<unknown>(functionName, {
      body: { action, ...payload },
    });
    if (error) {
      throw new AppError(
        'network',
        'The routing service is unavailable right now. Please try again.',
        error,
      );
    }
    return parse(data);
  }

  return {
    computeRoute: (request) => invoke('computeRoute', request, parseRouteSummary),
    getDistanceMatrix: (request) => invoke('distanceMatrix', request, parseDistanceMatrix),
    autocompletePlaces: (request) => invoke('placesAutocomplete', request, parsePlaceSuggestions),
    getPlaceDetails: (request) => invoke('placeDetails', request, parsePlaceDetails),
  };
}
