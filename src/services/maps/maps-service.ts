import type {
  DistanceMatrix,
  DistanceMatrixRequest,
  PlaceAutocompleteRequest,
  PlaceDetails,
  PlaceDetailsRequest,
  PlaceSuggestion,
  RouteRequest,
  RouteSummary,
} from '@/types/routing';

/**
 * Google routing, distance matrix and places, used through a server-side proxy.
 *
 * The live implementation calls a Supabase Edge Function so the Google API key
 * stays on the server (as an Edge Function secret) and never ships in the
 * app. See README "Google Maps proxy contract".
 */
export interface MapsService {
  computeRoute(request: RouteRequest): Promise<RouteSummary>;
  getDistanceMatrix(request: DistanceMatrixRequest): Promise<DistanceMatrix>;
  autocompletePlaces(request: PlaceAutocompleteRequest): Promise<PlaceSuggestion[]>;
  getPlaceDetails(request: PlaceDetailsRequest): Promise<PlaceDetails>;
}
